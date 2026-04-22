import csv
from datetime import datetime
import json
import random
from typing import Dict, List, Optional, Tuple
import requests
import re
from enum import Enum

# API endpoint
API_URL = "http://localhost:8000/api/college-branches/"

# Enums for data validation and transformation


class CutoffQuota(str, Enum):
    AI = "ai"
    HS = "hs"
    OS = "os"


class CutoffSeatType(str, Enum):
    OPEN = "open"
    EWS = "ews"
    OBC_NCL = "obc-ncl"
    SC = "sc"
    ST = "st"
    OPEN_PWD = "open-pwd"
    EWS_PWD = "ews-pwd"
    OBC_NCL_PWD = "obc-ncl-pwd"
    SC_PWD = "sc-pwd"
    ST_PWD = "st-pwd"


class CutoffGender(str, Enum):
    NEUTRAL = "neutral"
    FEMALE_ONLY = "female-only"


class CutoffExam(str, Enum):
    JEE_MAINS = "jee-mains"
    JEE_ADVANCED = "jee-advanced"


class CutoffType(str, Enum):
    RANK = "rank"  # Using rank type for JEE ranks


class CutoffCategory():
    quota: CutoffQuota
    seat_type: CutoffSeatType
    gender: CutoffGender
    exam: CutoffExam
    co_type: CutoffType


class Cutoff():
    year: int
    round: int
    cutoffs: Tuple[CutoffCategory | Tuple[int, int]]


class CollegeBranchPlacement():
    year: int
    average_package: Optional[float] = None
    highest_package: Optional[float] = None
    median_package: Optional[float] = None
    companies_visited: List[str] = []


class CollegeBranchBase():
    """Base model for creating a college branch without system fields."""
    college_id: str
    branch_id: str
    seats: Optional[int] = None
    fees_per_year: Optional[float] = None
    cutoffs: List[Cutoff] = []
    placements: List[CollegeBranchPlacement] = []


def clean_string(s):
    """Remove quotes and extra whitespace from strings"""
    if isinstance(s, str):
        return re.sub(r'^["\']\s*|\s*["\']$', '', s.strip())
    return s


def map_quota(quota_str):
    """Map CSV quota string to enum value"""
    quota_map = {
        "AI": CutoffQuota.AI,
        "HS": CutoffQuota.HS,
        "OS": CutoffQuota.OS
    }
    return quota_map.get(quota_str, CutoffQuota.AI)


def map_seat_type(seat_type_str):
    """Map CSV seat type string to enum value"""
    seat_type_str = seat_type_str.lower()
    seat_type_map = {
        "OPEN": CutoffSeatType.OPEN,
        "EWS": CutoffSeatType.EWS,
        "OBC-NCL": CutoffSeatType.OBC_NCL,
        "SC": CutoffSeatType.SC,
        "ST": CutoffSeatType.ST,
        "OPEN (PWD)": CutoffSeatType.OPEN_PWD,
        "WAS (PWD)": CutoffSeatType.EWS_PWD,
        "OBC-NCL (PWD)": CutoffSeatType.OBC_NCL_PWD,
        "SC (PWD)": CutoffSeatType.SC_PWD,
        "ST (PWD)": CutoffSeatType.ST_PWD
    }
    return seat_type_map.get(seat_type_str, CutoffSeatType.OPEN)


def map_gender(gender_str):
    """Map CSV gender string to enum value"""
    gender_map = {
        "Gender-Neutral": CutoffGender.NEUTRAL,
        "Female-only": CutoffGender.FEMALE_ONLY
    }
    return gender_map.get(gender_str, CutoffGender.NEUTRAL)


def map_exam(college_name):
    """Map college name to enum value"""
    if "Indian Institute of Technology" in college_name:
        return CutoffExam.JEE_ADVANCED
    return CutoffExam.JEE_MAINS


def generate_random_placement_data(institute_name, program_name):
    """Generate random placement data for a college branch"""
    # List of top companies that recruit from premier institutes
    top_companies = [
        "Google", "Microsoft", "Amazon", "Apple", "Meta", "Uber", "Flipkart",
        "Goldman Sachs", "Morgan Stanley", "JP Morgan", "Deutsche Bank",
        "Adobe", "Oracle", "Intel", "Qualcomm", "Samsung", "IBM", "Accenture",
        "Deloitte", "EY", "KPMG", "PwC", "TCS", "Wipro", "Infosys", "HCL",
        "Capgemini", "L&T", "Shell", "Reliance", "ONGC", "NTPC", "BHEL",
        "Bosch", "Siemens", "ABB", "GE", "Honeywell", "Unilever", "P&G"
    ]

    # Adjust package ranges based on program name
    is_premium_branch = any(term in program_name.lower() for term in [
                            "computer", "data", "ai", "machine learning", "electrical"])

    # Generate placement data for last 3 years
    placements = []
    current_year = datetime.now().year

    for year in range(current_year - 3, current_year):
        # Base package values
        if is_premium_branch:
            base_avg = random.uniform(12.0, 18.0)
            base_median = base_avg * random.uniform(0.9, 1.1)
            base_highest = base_avg * random.uniform(2.0, 3.5)
        else:
            base_avg = random.uniform(7.0, 14.0)
            base_median = base_avg * random.uniform(0.85, 1.05)
            base_highest = base_avg * random.uniform(1.8, 2.8)

        # Adjust for institute tier
        tier_factor = 1.0
        if "indian institute of technology" in institute_name.lower():
            tier_factor = random.uniform(1.3, 1.5)
        elif "national institute of technology" in institute_name.lower():
            tier_factor = random.uniform(1.1, 1.3)

        # Apply tier factor
        avg_package = round(base_avg * tier_factor, 2)
        median_package = round(base_median * tier_factor, 2)
        highest_package = round(base_highest * tier_factor, 2)

        # Select random companies
        num_companies = random.randint(8, 25)
        companies_visited = random.sample(
            top_companies, min(num_companies, len(top_companies)))

        placement = {
            "year": year,
            "average_package": avg_package,
            "median_package": median_package,
            "highest_package": highest_package,
            "companies_visited": companies_visited
        }

        placements.append(placement)

    return placements


def process_csv_to_api_data():
    """Process the CSV file and convert to API format"""
    # Dictionary to store college-branch combinations with their cutoffs
    college_branches = {}

    # Store institute and program names for realistic placement data generation
    institute_programs = {}

    with open('output/merged_cutoffs_with_ids.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)

        for row in reader:
            # Clean all string values
            cleaned_row = {k: clean_string(v) for k, v in row.items()}

            # Extract key info
            college_id = cleaned_row['college_id']
            branch_id = cleaned_row['branch_id']
            year = int(cleaned_row['Year'])
            round_num = int(cleaned_row['Round'])
            quota = map_quota(cleaned_row['Quota'])
            seat_type = map_seat_type(cleaned_row['Seat Type'])
            gender = map_gender(cleaned_row['Gender'])
            institute_name = cleaned_row['Institute']
            exam = map_exam(institute_name)
            program_name = cleaned_row['Academic Program Name']
            opening_rank = int(
                cleaned_row['Opening Rank'] if cleaned_row['Opening Rank'][-1].lower(
                ) != 'p' else cleaned_row['Opening Rank'][:-1]
            )
            closing_rank = int(cleaned_row['Closing Rank'] if cleaned_row['Closing Rank'][-1].lower(
            ) != 'p' else cleaned_row['Closing Rank'][:-1])

            # Create a unique key for each college-branch combination
            cb_key = f"{college_id}_{branch_id}"
            institute_programs[cb_key] = (institute_name, program_name)

            # Initialize if not exists
            if cb_key not in college_branches:
                college_branches[cb_key] = {
                    "college_id": college_id,
                    "branch_id": branch_id,
                    "seats": random.randint(20, 500),
                    "fees_per_year": random.randint(100000, 1000000),
                    "cutoffs": [],
                    "placements": []
                }

            # Create cutoff category
            cutoff_category = {
                "quota": quota.value,
                "seat_type": seat_type.value,
                "gender": gender.value,
                "exam": exam.value,
                "co_type": CutoffType.RANK.value
            }

            # Check if we already have a cutoff for this year and round
            year_round_exists = False
            for cutoff in college_branches[cb_key]["cutoffs"]:
                if cutoff["year"] == year and cutoff["round"] == round_num:
                    # Add to existing cutoff
                    cutoff_key = json.dumps(cutoff_category)
                    cutoff["cutoffs"][cutoff_key] = [
                        opening_rank, closing_rank]
                    year_round_exists = True
                    break

            # If not found, create a new cutoff entry
            if not year_round_exists:
                cutoff_key = json.dumps(cutoff_category)
                cutoff_entry = {
                    "year": year,
                    "round": round_num,
                    "cutoffs": {
                        cutoff_key: [opening_rank, closing_rank]
                    }
                }
                college_branches[cb_key]["cutoffs"].append(cutoff_entry)

    # Add placement data for each college-branch combination
    for cb_key, cb_data in college_branches.items():
        institute_name, program_name = institute_programs.get(
            cb_key, ("Unknown Institute", "Unknown Program"))
        placements = generate_random_placement_data(
            institute_name,
            program_name
        )
        cb_data["placements"] = placements

    return list(college_branches.values())


def convert_to_api_format(data):
    """Convert data to API format"""
    api_data = []

    for college_branch in data:
        api_entry = {
            "college_id": college_branch["college_id"],
            "branch_id": college_branch["branch_id"],
            "seats": college_branch["seats"],
            "fees_per_year": college_branch["fees_per_year"],
            "cutoffs": [],
            "placements": []
        }

        for cutoff in college_branch["cutoffs"]:
            cutoff_entry = {
                "year": cutoff["year"],
                "counselling_round": cutoff["round"],
            }

            for cutoff_category, cutoff_range in cutoff["cutoffs"].items():
                cutoff_category = json.loads(cutoff_category)
                cutoff_entry["category"] = cutoff_category
                cutoff_entry["opening_rank"] = cutoff_range[0]
                cutoff_entry["closing_rank"] = cutoff_range[1]
                api_entry["cutoffs"].append(cutoff_entry)

        for placement in college_branch["placements"]:
            api_entry["placements"].append({
                "year": placement["year"],
                "average_package": placement["average_package"],
                "highest_package": placement["highest_package"],
                "median_package": placement["median_package"],
                "companies_visited": placement["companies_visited"]
            })

        api_data.append(api_entry)

    return api_data


def upload_to_api(data):
    """Upload data to the API endpoint"""
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    success_count = 0
    failure_count = 0

    for college_branch in data:
        try:
            response = requests.post(
                API_URL, json=college_branch, headers=headers)
            if response.status_code == 200:
                success_count += 1
                print(
                    f"Successfully uploaded: {college_branch['college_id']} - {college_branch['branch_id']}")
            else:
                failure_count += 1
                print(
                    f"Failed to upload: {college_branch['college_id']} - {college_branch['branch_id']}")
                print(f"Status code: {response.status_code}")
                print(f"Response: {response.text}")
        except Exception as e:
            failure_count += 1
            print(
                f"Error uploading: {college_branch['college_id']} - {college_branch['branch_id']}")
            print(f"Exception: {str(e)}")

    print(f"\nUpload summary:")
    print(f"Successfully uploaded: {success_count}")
    print(f"Failed to upload: {failure_count}")
    print(f"Total processed: {success_count + failure_count}")


def main():
    print("Processing CSV data...")
    api_data = process_csv_to_api_data()
    api_data = convert_to_api_format(api_data)
    print(f"Processed {len(api_data)} college-branch combinations.")

    print("\nPreparing to upload to API...")
    upload_confirmation = input(
        "Do you want to proceed with uploading to the API? (y/n): ")

    if upload_confirmation.lower() == 'y':
        upload_to_api(api_data)
    else:
        print("Upload canceled.")
        # Optionally save to a file instead
        with open('processed_data.json', 'w') as f:
            json.dump(api_data, f, indent=2)
        print("Data saved to processed_data.json")


if __name__ == "__main__":
    main()
