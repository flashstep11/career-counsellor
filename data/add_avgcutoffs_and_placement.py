from pymongo import MongoClient
from bson import ObjectId

MONGO_URL = "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?retryWrites=true&w=majority&appName=cc"
DB_NAME = "career_counselling"
COLLECTION_NAME = "college_branches"  # Adjust if needed

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

def compute_avg_placement(placements):
    """
    Given a list of placement dicts, compute the average of the 'average_package'
    values (ignoring None values). Returns 0 if no valid values are found.
    """
    avg_packages = [p.get("average_package") for p in placements if p.get("average_package") is not None]
    if avg_packages:
        return sum(avg_packages) / len(avg_packages)
    return 0.0

def compute_avg_cutoffs(cutoffs):
    """
    Given a list of cutoff dicts, group them by the combination of
    (quota, seat_type, gender, exam, co_type) and compute average opening and closing ranks.
    
    Returns a list of dicts matching the structure of AvgCutoff:
      {
         "category": {
             "quota": ...,
             "seat_type": ...,
             "gender": ...,
             "exam": ...,
             "co_type": ...
         },
         "opening_rank": averaged opening rank,
         "closing_rank": averaged closing rank
      }
    """
    groups = {}
    for cutoff in cutoffs:
        category = cutoff.get("category", {})
        # Group by quota, seat_type, gender, exam, and co_type
        key = (
            category.get("quota"),
            category.get("seat_type"),
            category.get("gender"),
            category.get("exam"),
            category.get("co_type")
        )
        if key not in groups:
            groups[key] = {
                "opening_ranks": [],
                "closing_ranks": []
            }
        groups[key]["opening_ranks"].append(cutoff.get("opening_rank"))
        groups[key]["closing_ranks"].append(cutoff.get("closing_rank"))
    
    avg_cutoffs = []
    for key, values in groups.items():
        quota, seat_type, gender, exam, co_type = key
        # Compute averages (cast to int or round as desired)
        opening_avg = int(sum(values["opening_ranks"]) / len(values["opening_ranks"]))
        closing_avg = int(sum(values["closing_ranks"]) / len(values["closing_ranks"]))
        
        category_dict = {
            "quota": quota,
            "seat_type": seat_type,
            "gender": gender,
            "exam": exam,
            "co_type": co_type
        }
        avg_cutoff = {
            "category": category_dict,
            "opening_rank": opening_avg,
            "closing_rank": closing_avg
        }
        avg_cutoffs.append(avg_cutoff)
    
    return avg_cutoffs

def update_college_branches():
    # Iterate over each college branch document
    for doc in collection.find():
        placements = doc.get("placements", [])
        cutoffs = doc.get("cutoffs", [])
        
        # Compute avg_placement and avg_cutoffs based on existing data
        avg_placement = compute_avg_placement(placements)
        avg_cutoffs = compute_avg_cutoffs(cutoffs)
        
        # Prepare the update payload
        update_fields = {
            "avg_placement": avg_placement,
            "avg_cutoffs": avg_cutoffs
        }
        
        result = collection.update_one({"_id": doc["_id"]}, {"$set": update_fields})
        print(f"Updated document {str(doc['_id'])}: Matched {result.matched_count}, Modified {result.modified_count}")

if __name__ == "__main__":
    update_college_branches()
    print("All documents updated.")
