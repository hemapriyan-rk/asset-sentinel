# code/core/visualization.py

import matplotlib.pyplot as plt


def plot_asset_analysis(asset_df, asset_id, baseline, warning, critical):

    colors = {
        "NORMAL": "green",
        "MONITOR": "yellow",
        "ATTENTION": "orange",
        "URGENT": "red"
    }

    state_map = {"NORMAL": 0, "MONITOR": 1, "ATTENTION": 2, "URGENT": 3}
    asset_df["state_code"] = asset_df["state_final"].map(state_map)

    plt.figure(figsize=(14, 10))

    # ================= 1. DEGRADATION =================
    plt.subplot(3, 1, 1)

    for i in range(1, len(asset_df)):
        state = asset_df["state_final"].iloc[i]
        plt.plot(
            asset_df["timestamp"].iloc[i-1:i+1],
            asset_df["D"].iloc[i-1:i+1],
            color=colors[state]
        )

    # Threshold lines
    plt.axhline(baseline, linestyle="--", color="green", label="Baseline")
    plt.axhline(warning, linestyle="--", color="orange", label="Warning")
    plt.axhline(critical, linestyle="--", color="red", label="Critical")

    # Background zones
    plt.fill_between(asset_df["timestamp"], 0, baseline, color="green", alpha=0.1)
    plt.fill_between(asset_df["timestamp"], baseline, warning, color="yellow", alpha=0.1)
    plt.fill_between(asset_df["timestamp"], warning, critical, color="orange", alpha=0.1)
    plt.fill_between(asset_df["timestamp"], critical, asset_df["D"].max(), color="red", alpha=0.1)

    # Mark urgent points
    urgent = asset_df[asset_df["state_final"] == "URGENT"]
    plt.scatter(
        urgent["timestamp"],
        urgent["D"],
        color="red",
        marker="X",
        s=60,
        label="Critical Event"
    )

    plt.title(f"Asset {asset_id} – Degradation Index")
    plt.legend()

    # ================= 2. ACCELERATION =================
    plt.subplot(3, 1, 2)

    for i in range(1, len(asset_df)):
        state = asset_df["state_final"].iloc[i]
        plt.plot(
            asset_df["timestamp"].iloc[i-1:i+1],
            asset_df["acc"].iloc[i-1:i+1],
            color=colors[state]
        )

    # Zero line
    plt.axhline(0, linestyle="--", color="black", alpha=0.5)

    # Positive vs negative zones
    plt.fill_between(
        asset_df["timestamp"],
        0,
        asset_df["acc"],
        where=(asset_df["acc"] > 0),
        color="red",
        alpha=0.1
    )

    plt.fill_between(
        asset_df["timestamp"],
        0,
        asset_df["acc"],
        where=(asset_df["acc"] <= 0),
        color="green",
        alpha=0.1
    )

    plt.title("Acceleration")

    # ================= 3. STATE TIMELINE =================
    plt.subplot(3, 1, 3)

    for state, color in colors.items():
        mask = asset_df["state_final"] == state
        plt.scatter(
            asset_df["timestamp"][mask],
            asset_df["state_code"][mask],
            color=color,
            label=state,
            s=25
        )

    plt.yticks(list(state_map.values()), list(state_map.keys()))
    plt.title("State Timeline")
    plt.legend()

    plt.tight_layout()
    plt.show()