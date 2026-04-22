import pandas as pd
import numpy as np
import re
import random

# List of all states and union territories in India
states_of_india = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
    "Ladakh", "Lakshadweep", "Puducherry"
]

# Read the colleges data
df_colleges = pd.read_csv('output/colleges_with_ids.csv')

# Read NIRF data
nirf_data = pd.read_csv('source/nirf.tsv', sep='\t')
nirf_data.columns = ['Name', '2024', '2023', '2022', '2021']

# Function to find state in text


def find_state(text):
    if isinstance(text, str):
        for state in states_of_india:
            if state.lower() in text.lower():
                return state
    return None


# Determine state for each college
df_colleges['state'] = None
for idx, row in df_colleges.iterrows():
    # Check Institute Name
    state = find_state(row['Institute Name'])
    if state is None:
        # Check Address
        state = find_state(row['Address'])
    if state is None:
        # Check Description
        state = find_state(row['description'])
    if state is None:
        # Assign random state
        state = random.choice(states_of_india)

    df_colleges.at[idx, 'state'] = state

# Keep track of used NIRF rankings
used_rankings = set()
for _, row in nirf_data.iterrows():
    if pd.notna(row['2024']):
        used_rankings.add(int(row['2024']))

# Generate potential random rankings (that aren't already in the NIRF data)
all_possible_rankings = set(range(1, 300))  # Assuming rankings go up to 300
available_rankings = list(all_possible_rankings - used_rankings)
random.shuffle(available_rankings)

# Assign NIRF rankings
df_colleges['nirfRanking'] = None
for idx, college in df_colleges.iterrows():
    college_name = college['Institute Name'].lower()
    found = False

    for _, nirf_row in nirf_data.iterrows():
        nirf_name = nirf_row['Name'].lower()
        if college_name in nirf_name or nirf_name in college_name:
            df_colleges.at[idx, 'nirfRanking'] = nirf_row['2024']
            found = True
            break

    if not found:
        # Assign a random available ranking
        if available_rankings:
            random_rank = available_rankings.pop()
            df_colleges.at[idx, 'nirfRanking'] = random_rank
            used_rankings.add(random_rank)
        else:
            # If we run out of available rankings, generate a new one that's not used
            new_rank = max(used_rankings) + 1
            df_colleges.at[idx, 'nirfRanking'] = new_rank
            used_rankings.add(new_rank)

# Generate random gender ratios
df_colleges['gender_ratio'] = np.random.uniform(0, 1, size=len(df_colleges))

# Save the updated data
df_colleges.to_csv('output/colleges_with_filled_data.csv', index=False)

print(f"Processed {len(df_colleges)} colleges.")
print(f"States assigned: {df_colleges['state'].nunique()} unique states")
print(
    f"NIRF rankings assigned: {df_colleges['nirfRanking'].nunique()} unique rankings")
print("Gender ratios assigned with random values between 0 and 1")
