import random
import requests
from time import sleep
from pymongo import MongoClient

# MongoDB connection parameters
MONGO_URL = "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?retryWrites=true&w=majority&appName=cc"
DB_NAME = "career_counselling"
COLLECTION_NAME = "colleges"

# Maps.co API parameters (free)
MAPS_CO_API_URL = "https://geocode.maps.co/search"
MAPS_CO_API_KEY = ""

def geocode_address(address: str, college_name: str) -> (float, float):
    """
    Use Maps.co geocoding service to get coordinates based on address.
    This is a free geocoding service with generous limits.
    """
    # Create a more specific query to improve geocoding accuracy
    query = f"{college_name} college, {address}, India"
    
    # Use the exact URL format provided
    url = f"https://geocode.maps.co/search?q={query}&api_key={MAPS_CO_API_KEY}"
    
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            
            if data and len(data) > 0:
                latitude = float(data[0]['lat'])
                longitude = float(data[0]['lon'])
                print(f"Successfully geocoded: {college_name} -> Lat: {latitude}, Lng: {longitude}")
                return latitude, longitude
            else:
                print(f"No results found for {college_name}")
        else:
            print(f"API returned non-200 status: {response.status_code} for query: {query}")
    except requests.exceptions.RequestException as e:
        print(f"Request exception during API call for query: {query}\nError: {e}")
    except (KeyError, ValueError) as e:
        print(f"Error parsing response for {college_name}: {e}")
    
    print(f"Could not geocode address for {college_name}")
    return None, None

def update_college_with_locations():
    """
    Update each college document in the MongoDB collection with coordinates 
    retrieved from the Maps.co API. Skip colleges without valid coordinates.
    """
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    updated_count = 0
    skipped_count = 0
    
    for college in collection.find():
        college_name = college.get("name", "Unknown College")
        address = college.get("address", None)
        latitude, longitude = None, None

        if address:
            latitude, longitude = geocode_address(address, college_name)
        else:
            print(f"No address provided for {college_name}")
        
        # Skip the college if we couldn't get coordinates
        if not (latitude and longitude):
            print(f"Skipping {college_name} - no coordinates available")
            skipped_count += 1
            continue
        
        # Generate a random h-index for now
        h_index = random.randint(20, 45)
        
        update_fields = {
            "latitude": latitude,
            "longitude": longitude,
            "h_index": h_index
        }
        
        result = collection.update_one({"_id": college["_id"]}, {"$set": update_fields})
        if result.modified_count > 0:
            updated_count += 1
        
        # Sleep for 1.5 seconds to respect Maps.co's usage policy (max 1 request per second)
        sleep(1.5)
    
    client.close()
    
    print("\nSummary:")
    print(f"Total colleges successfully geocoded and updated: {updated_count}")
    print(f"Colleges skipped due to missing coordinates: {skipped_count}")

if __name__ == "__main__":
    update_college_with_locations()
    print("College location update completed.")
