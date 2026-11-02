#!/bin/sh
# Downloads the four public trace files used in section 5 of REPORT.md (about 2.9 MB) and checks their sha256 against boar-research/TRACES.tsv.
# usage: sh fetch_traces.sh <empty output dir>     (then: python3 -I router_misfires.py <labrat> <boar-bench> <output dir>)
set -eu
D="$1"; mkdir -p "$D/out" "$D/hf"; B=https://huggingface.co/datasets/r4topunk/boar-traces/resolve/main
get() { curl -sSL -A "Mozilla/5.0" "$B/$1" -o "$2"; [ "$(sha256sum "$2" | cut -d' ' -f1)" = "$3" ] && echo "ok   $2" || { echo "FAIL $2"; exit 1; }; }
get rnd/research/coordinator/arms/device-final/out/df-m2-probes-s42.jsonl "$D/out/df-m2-probes-s42.jsonl" b8be421dbae5959507c97cd74a2349894ec6e14898389f0552cbdeca5690af4e
get rnd/heldout/bench-v02/runs-deepvpara/dv-D-v02-s42.traces.jsonl "$D/hf/dv-D-v02-s42.traces.jsonl" da0b45a136fad84cd6706cbe427e1f12ff5fd25502ee19062307a1a065873874
get rnd/heldout/bench-v02/runs-cut6/cut6-v02-s42.traces.jsonl "$D/hf/cut6-v02-s42.traces.jsonl" a379e791f0476126ec619f1ca02c01834a1b33ace586d393512e1cb9d92e94c3
get rnd/heldout/vitalik-para1/runs-cut6/cut6-vpara-s42.traces.jsonl "$D/hf/cut6-vpara-s42.traces.jsonl" f3d3e49ef693efa686d12d628e044b25f8646072a6544843d50d7203b225e6ba
