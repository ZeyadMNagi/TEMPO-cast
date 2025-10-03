import pyrsig
import pandas as pd
import matplotlib.pyplot as plt

locname = "nyc"
bbox = (-74.8, 40.32, -71.43, 41.4)

api = pyrsig.RsigApi(bdate="15:00", edate="18:00", bbox=bbox, workdir=locname, gridfit=True)
api_key = "anonymous" 
api.tempo_kw["api_key"] = api_key

descdf = api.descriptions()
print("--- Available Data ---")
print(descdf)

species_to_process = {
    "no2": "tempo.l2.no2.vertical_column_troposphere",
    "hcho": "tempo.l2.hcho.vertical_column",
    "o3": "tempo.l2.o3.vertical_column"
}

for species, tempokey in species_to_process.items():
    print(f"\n--- Processing {species.upper()} data for key: {tempokey} ---")

    if tempokey not in descdf['name'].values:
        print(f"Warning: Key '{tempokey}' not found in descriptions. Skipping.")
        continue

    df = api.to_dataframe(tempokey, unit_keys=False, parse_dates=True, backend="xdr")
    print(df)

    raw_json_filename = f"{locname}_tempo_{species}_raw.json"
    df.to_json(raw_json_filename, orient="records", indent=4)
    print(f"\n--- Saved raw data ({len(df)} rows) to {raw_json_filename} ---")

    # Make an hourly average
    print(f"\n--- Creating hourly average for {species.upper()} ---")
    hdf = df.groupby(pd.Grouper(key="time", freq="1h")).mean(numeric_only=True)
    print(hdf)

    json_filename = f"{locname}_tempo_{species}_hourly.json"
    hdf.to_json(json_filename, orient="index", indent=4)
    print(f"\n--- Saved hourly data to {json_filename} ---")

    data_column_name = df.columns[3]
    ax = hdf[data_column_name].plot(ylim=(0, None), ylabel=f"{species.upper()} [molec/cm2]", title=f"Hourly Average TEMPO {species.upper()} over {locname}")
    plt.show()
