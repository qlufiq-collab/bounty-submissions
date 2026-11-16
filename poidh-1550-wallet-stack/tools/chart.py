import json, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
D = "./"
e = json.load(open(D + "data/estimate.json"))
S, T1, T2, GRID, BLUE, ORANGE = "#fcfcfb", "#0b0b0b", "#52514e", "#e6e5e1", "#2a78d6", "#eb6834"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 13, "axes.edgecolor": GRID, "xtick.color": T2, "ytick.color": T2})
fig = plt.figure(figsize=(16, 9), dpi=100, facecolor=S)
fig.text(0.04, 0.93, "By November ~72% of poidh claims came from agents. Only 32% said so.", fontsize=26, weight="bold", color=T1)
fig.text(0.04, 0.885, "Signal: the wallet that signed each claim, read at the claim's own block. Consumer smart wallets (Uniswap, Coinbase, MetaMask)"
         " almost never sign agent claims.", fontsize=13, color=T2)
ax = fig.add_axes([0.05, 0.14, 0.56, 0.66], facecolor=S)
rows = e["rows"]; xs = list(range(len(rows))); lab = [r["month"][2:].replace("-", "/") for r in rows]
win = [i for i, r in enumerate(rows) if r["in_window"]]
est = [r["agent_est"] * 100 for r in rows]; lo = [r["lo"] * 100 for r in rows]; hi = [r["hi"] * 100 for r in rows]
fl = [r["selfdeclared_floor"] * 100 for r in rows]
ax.fill_between(win, [lo[i] for i in win], [hi[i] for i in win], color=BLUE, alpha=0.15, lw=0)
ax.plot(win, [est[i] for i in win], color=BLUE, lw=2.5, marker="o", ms=8, mec=S, mew=2)
ax.plot(xs, fl, color=ORANGE, lw=2, marker="o", ms=7, mec=S, mew=2, ls=(0, (4, 2)))
ax.annotate(f"{est[-1]:.0f}%", (xs[-1], est[-1]), textcoords="offset points", xytext=(-40, 6), fontsize=17, weight="bold", color=T1)
ax.annotate(f"{fl[-1]:.0f}%", (xs[-1], fl[-1]), textcoords="offset points", xytext=(-40, -22), fontsize=15, weight="bold", color=T1)
ax.annotate(f"{est[-2]:.0f}%", (xs[-2], est[-2]), textcoords="offset points", xytext=(-38, 8), fontsize=14, weight="bold", color=T1)
ax.text(win[0] - 0.2, 66, "all agents (estimate,\n95% bootstrap band)", color=BLUE, fontsize=12, weight="bold")
ax.text(1.0, 12, "self-declared agents (verified floor)", color="#b5481b", fontsize=12, weight="bold")
ax.text(1.4, 52, "Estimate shown only from July:\nbefore that, consumer-wallet\nadoption was still ramping up", fontsize=11, color=T2, ha="center")
ax.set_xticks(xs, lab); ax.set_ylim(0, 100); ax.set_yticks(range(0, 101, 20), [f"{v}%" for v in range(0, 101, 20)])
ax.grid(axis="y", color=GRID, lw=1); ax.set_axisbelow(True)
for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
ax.set_title("Share of Base claims made by agents, by month (2026)", loc="left", fontsize=15, color=T1, pad=12)
ax2 = fig.add_axes([0.69, 0.14, 0.28, 0.66], facecolor=S)
vals = [e["a_agent"] * 100, e["h_human"] * 100]
bars = ax2.bar([0, 1], vals, color=[ORANGE, "#8e8d88"], width=0.55)
for b, v in zip(bars, vals):
    ax2.text(b.get_x() + b.get_width() / 2, v + 1.0, f"{v:.1f}%", ha="center", fontsize=18, weight="bold", color=T1)
ax2.set_xticks([0, 1], [f"self-declared agents\n({e['n_agent']} claims)", f"pre-agent wallets\n({e['n_human']} claims, Jul-Sep)"])
ax2.set_ylim(0, 45); ax2.set_yticks([])
for s in ("top", "right", "left"): ax2.spines[s].set_visible(False)
ax2.set_title("Calibration: claims signed by a\nconsumer smart wallet", loc="left", fontsize=15, color=T1, pad=12)
fig.text(0.04, 0.055, "Data: all 4,318 ClaimCreated events on PoidhV3 Base 0x5555...1719 (20 Jan - 15 Nov 2026); tx and wallet code at each claim's block "
         "from public archive RPC.", fontsize=10.5, color=T2)
fig.text(0.04, 0.03, "Estimator: agent share = 1 - (s - a) / (h - a), s = consumer share that month. Code, data, method: "
         "github.com/qlufiq-collab/bounty-submissions/tree/main/poidh-1550-wallet-stack", fontsize=10.5, color=T2)
fig.savefig(D + "finding.png", facecolor=S)
print("ok")
