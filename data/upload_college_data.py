import csv
import requests
import json
import os
from datetime import datetime


def read_college_data(csv_file_path):
    """Read college data from CSV file."""
    colleges = []

    try:
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                colleges.append(row)
        return colleges
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return None


def prepare_api_data(college: dict):
    """Convert CSV row to API request format."""
    # Map CSV fields to API request fields
    api_data = {
        "name": college.get("Institute Name", ""),
        "address": college.get("Address", ""),
        "type": college.get("College Type", "public").lower(),
        "description": college.get("description", ""),
        "website": college.get("website", ""),
        "email": college.get("email", ""),
        "phone": college.get("phone number", ""),
        "yearOfEstablishment": int(college.get("year of establishment", 0)) if college.get("year of establishment", "").isdigit() else 0,
        "landArea": float(college.get("landarea", 0)) if college.get("landarea", "").replace(".", "", 1).isdigit() else 0,
        "placement": float(college.get("placement avg", 0)) if college.get("placement avg", "").replace(".", "", 1).isdigit() else 0,
        "placementMedian": float(college.get("placement median", 0)) if college.get("placement median", "").replace(".", "", 1).isdigit() else 0,
        "placementOther": {},
        "notableAlumni": [],
        "notableFaculty": []
    }
    if not (api_data["website"].startswith("http://") or api_data["website"].startswith("https://")):
        api_data["website"] = "https://" + api_data["website"]
    return api_data


def upload_to_api(api_data, api_url):
    """Upload data to API and return response."""
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }

    try:
        response = requests.post(
            api_url, headers=headers, data=json.dumps(api_data))
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"Error making API request: {e}")
        return None


def create_updated_csv(original_data, api_responses, output_file):
    """Create new CSV with API-returned IDs."""
    if not api_responses:
        print("No API responses to write to CSV")
        return False

    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            # Get all fields from original CSV plus the collegeID
            fieldnames = list(original_data[0].keys())
            if 'Institute ID' in fieldnames:
                # Replace Institute ID with collegeID
                fieldnames[fieldnames.index('Institute ID')] = 'collegeID'
            else:
                # Add collegeID if Institute ID wasn't present
                fieldnames.append('collegeID')

            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for i, college in enumerate(original_data):
                if i < len(api_responses) and api_responses[i]:
                    # Create a new row with all original data
                    new_row = college.copy()

                    # Replace Institute ID with collegeID from API response
                    if 'Institute ID' in new_row:
                        new_row['collegeID'] = api_responses[i].get(
                            'collegeID', '')
                        del new_row['Institute ID']
                    else:
                        new_row['collegeID'] = api_responses[i].get(
                            'collegeID', '')

                    writer.writerow(new_row)
                else:
                    # If no API response for this row, keep original ID
                    writer.writerow(college)

        return True
    except Exception as e:
        print(f"Error writing output CSV: {e}")
        return False


def main():
    # Configuration
    input_csv = 'output/college_data_filled.csv'  # Input CSV file path
    api_url = 'http://localhost:8000/api/colleges/'
    output_csv = f'output/colleges_with_ids.csv'

    print(f"Reading college data from {input_csv}...")
    colleges = read_college_data(input_csv)

    if not colleges:
        print("No college data found. Exiting.")
        return

    print(f"Found {len(colleges)} colleges. Starting API uploads...")

    api_responses = []
    for i, college in enumerate(colleges):
        print(
            f"Processing college {i+1}/{len(colleges)}: {college.get('Institute Name', 'Unknown')}")
        api_data = prepare_api_data(college)
        response = upload_to_api(api_data, api_url)
        api_responses.append(response)

        # Optional: Add delay between requests to avoid rate limiting
        # import time
        # time.sleep(1)

    successful_uploads = sum(1 for r in api_responses if r is not None)
    print(
        f"Uploads completed. {successful_uploads}/{len(colleges)} successful.")

    if successful_uploads > 0:
        print(f"Creating updated CSV file: {output_csv}")
        if create_updated_csv(colleges, api_responses, output_csv):
            print(f"Successfully created {output_csv} with API-returned IDs")
        else:
            print(f"Failed to create updated CSV file")
    else:
        print("No successful uploads. No updated CSV created.")


if __name__ == "__main__":
    main()
