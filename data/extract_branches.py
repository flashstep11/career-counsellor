# wap to read the 4th column of each csv file in the directory and return the list of unique values in the 4th column of all the csv files

import os
import csv
import pandas as pd


def read_csv_files(directory):
    unique_branches = set()
    unique_colleges = set()
    directory = os.path.join(directory, "source")
    for file in os.listdir(directory):
        if file.endswith(".csv") and "Round" in file:
            with open(os.path.join(directory, file), "r") as f:
                reader = csv.reader(f)
                next(reader, None)
                for row in reader:
                    unique_branches.add(row[3])
                    unique_colleges.add(row[2])
    return list(unique_branches), list(unique_colleges)


def process_entries(values):
    processed_values = []
    for value in values:
        if not value:
            continue
        try:
            comma_index = value.find(",")
            open_paren_index = value.rfind("(", 0, comma_index)
            close_paren_index = -1
            name = value[:open_paren_index].strip()
            duration = value[open_paren_index + 1:comma_index].strip()
            type_ = value[comma_index + 1:close_paren_index].strip()
            processed_values.append((name, int(duration[0]), type_))
        except Exception as e:
            print(f"Invalid value ({e}): {value}")
    return processed_values


if __name__ == "__main__":
    directory = os.getcwd()
    unique_branches, unique_colleges = read_csv_files(directory)
    processed_values = process_entries(unique_branches)
    # write to a new csv file
    df = pd.DataFrame(processed_values, columns=[
                      "Name", "Duration (years)", "Type"])
    output_dir = os.path.join(directory, "output")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    df.to_csv(os.path.join(output_dir, "branches.csv"), index=False)

    with open(os.path.join(output_dir, "colleges.txt"), "w") as f:
        for college in unique_colleges:
            if not college:
                continue
            f.write(college + "\n")
