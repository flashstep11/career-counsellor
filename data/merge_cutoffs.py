import pandas as pd
import glob
import os


def main():
    csv_folder_path = "source"
    all_csv_files = glob.glob(os.path.join(csv_folder_path, "*Round*.csv"))
    print("Found files:", all_csv_files)
    if not all_csv_files:
        print("No matching CSV files found.")
        return

    dataframes = [pd.read_csv(file) for file in all_csv_files]
    merged_df = pd.concat(dataframes, ignore_index=True)
    merged_df = merged_df[merged_df.iloc[:, 2].notna()]

    output_file = "output/merged_cutoffs.csv"
    merged_df.to_csv(output_file, index=False)
    print(f"Merged {len(all_csv_files)} files into {output_file}")


if __name__ == "__main__":
    main()
