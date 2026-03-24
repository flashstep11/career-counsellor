import requests
import csv
import json


def create_branches_from_csv(input_file, output_file, api_url):
    """
    Read branch data from a CSV file, create branches via API requests,
    and write the results with IDs to a new CSV file.

    Args:
        input_file (str): Path to input CSV file (name,duration,degree_name)
        output_file (str): Path to output CSV file (id,name,duration,degree_name)
        api_url (str): URL for the branch creation API endpoint
    """
    # Read input CSV file
    branches = []
    with open(input_file, 'r') as csvfile:
        reader = csv.reader(csvfile)
        next(reader, None)
        for row in reader:
            if len(row) >= 3:  # Ensure we have at least 3 columns
                name, duration, degree_name = row[0], row[1], row[2]

                # Create branch data in required format
                branch_data = {
                    "name": name,
                    "degree_name": degree_name,
                    "duration": int(duration) if duration.isdigit() else 0,
                    "description": "",  # Empty description
                    "eligibility_criteria": ""  # Empty eligibility criteria
                }
                branches.append(branch_data)

    # Send API requests and collect responses
    results = []
    headers = {"Content-Type": "application/json"}

    for branch in branches:
        try:
            response = requests.post(api_url, json=branch, headers=headers)

            if response.status_code == 200:
                # Extract data from successful response
                branch_response = response.json()

                # Add ID to original branch data
                branch_with_id = {
                    "id": branch_response.get("_id", ""),
                    "name": branch["name"],
                    "duration": branch["duration"],
                    "degree_name": branch["degree_name"]
                }
                results.append(branch_with_id)
                print(f"Successfully created branch: {branch['name']}")
            else:
                print(
                    f"Failed to create branch {branch['name']}: {response.status_code}")
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error creating branch {branch['name']}: {str(e)}")

    # Write results to output CSV file
    with open(output_file, 'w', newline='') as csvfile:
        fieldnames = ['id', 'name', 'duration', 'degree_name']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for result in results:
            writer.writerow(result)

    print(
        f"Processed {len(branches)} branches, created {len(results)} successfully.")
    print(f"Results written to {output_file}")


if __name__ == "__main__":
    # Configuration
    INPUT_CSV = "output/branches.csv"
    OUTPUT_CSV = "output/branches_with_ids.csv"
    API_URL = "http://localhost:8000/api/branches/"

    # Run the process
    create_branches_from_csv(INPUT_CSV, OUTPUT_CSV, API_URL)
