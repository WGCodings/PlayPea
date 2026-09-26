#!/usr/bin/env bash
# The published v4.0 binaries embed the small Net1 (768->64)x2->1, while the
# v4.0 tag points at the big Net0. Reproduce the release (verified by node counts).
set -euo pipefail
sed -i 's|run4_net_0/run4_net_0-10|run4_net_1/run4_net_1-10|' src/main.rs
sed -i 's|^const HIDDEN_SIZE: usize = 1536;|const HIDDEN_SIZE: usize = 64;|' src/nnue/network.rs
sed -i 's|^const NUM_OUTPUT_BUCKETS : usize = 8;|const NUM_OUTPUT_BUCKETS : usize = 1;|' src/nnue/network.rs
