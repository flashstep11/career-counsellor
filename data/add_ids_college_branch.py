# read merged_cutoffs.csv with following format:
# Year,Round,Institute,Academic Program Name,Quota,Seat Type,Gender,Opening Rank,Closing Rank
# then read the branches_with_ids.csv: id,name,duration,degree_name
# and colleges_with_ids.csv: collegeID,Institute Name,Address,Contact Info,email,College Type,rural/urban,description,year of establishment,landarea,placement avg,placement median,phone number,fax number,website
# then, add college_id, branch_id, to the merged_cutoffs.csv data using the college name and (branch name, duration, degree_name) from the respective csv files
# and save the data to a new csv file
# the academic program name in merged_cutoffs.csv is in the format: branch_name (duration, degree_name), use the following function to extract it:
#             comma_index = value.find(",")
#             open_paren_index = value.rfind("(", 0, comma_index)
#             close_paren_index = -1
#             name = value[:open_paren_index].strip()
#             duration = value[open_paren_index + 1:comma_index].strip()
#             type_ = value[comma_index + 1:close_paren_index].strip()

import csv
import os


def extract_branch_details(value):
    try:
        comma_index = value.find(",")
        open_paren_index = value.rfind("(", 0, comma_index)
        close_paren_index = -1
        name = value[:open_paren_index].strip()
        duration = int(value[open_paren_index + 1:comma_index].strip()[0])
        type_ = value[comma_index + 1:close_paren_index].strip()
        return name, duration, type_
    except Exception as e:
        print(f"Invalid value ({e}): {value}")
        return None, None, None


def read_csv(file_path):
    data = []
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        next(reader, None)
        for row in reader:
            data.append(row)
    return data


def merge_data(cutoffs_file, branches_file, colleges_file, output_file):
    cutoffs_data = read_csv(cutoffs_file)
    branches_data = read_csv(branches_file)
    colleges_data = read_csv(colleges_file)

    # Create a dictionary of branch details
    branch_details = {}
    for branch in branches_data:
        branch_details[f'{branch[1]}, {branch[2]}, {branch[3]}'] = (branch[0])

    # Create a dictionary of college details
    college_details = {}
    for college in colleges_data:
        college_details[college[1]] = college[0]

    # Merge the data
    merged_data = []
    for cutoff in cutoffs_data:
        branch_name, duration, degree_name = extract_branch_details(cutoff[3])
        branch_key = f'{branch_name}, {duration}, {degree_name}'
        college_id = college_details.get(cutoff[2])
        branch_id = branch_details.get(branch_key)
        if college_id and branch_id:
            merged_data.append(cutoff + [college_id, branch_id])
        else:
            print(f"Missing data for: {cutoff[2]}, {branch_key}")

    # Write the merged data to a new file
    with open(output_file, "w", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["Year", "Round", "Institute",
                        "Academic Program Name", "Quota", "Seat Type", "Gender", "Opening Rank", "Closing Rank", "college_id", "branch_id"])
        for row in merged_data:
            writer.writerow(row)


if __name__ == "__main__":
    cutoffs_file = os.path.join("output", "merged_cutoffs.csv")
    branches_file = os.path.join("output", "branches_with_ids.csv")
    colleges_file = os.path.join("output", "colleges_with_ids.csv")
    output_file = os.path.join("output", "merged_cutoffs_with_ids.csv")

    merge_data(cutoffs_file, branches_file, colleges_file, output_file)
