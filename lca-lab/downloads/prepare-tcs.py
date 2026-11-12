"""Prepare TCS binary response counts locally from an authorized TCS_mplus.csv."""

import argparse
import csv
from collections import Counter
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Original headerless TCS_mplus.csv")
    parser.add_argument("--output", type=Path, default=Path("tcs-patterns.dat"))
    args = parser.parse_args()
    counts = Counter()
    excluded = 0
    with args.csv.open(encoding="utf-8-sig", newline="") as stream:
        for line, row in enumerate(csv.reader(stream), 1):
            if len(row) != 15:
                parser.error(f"Row {line} must have 15 columns.")
            try:
                pattern = tuple(int(value) for value in row[1:7])
            except ValueError:
                parser.error(f"Row {line} has a noninteger indicator.")
            if any(value not in (-9, 0, 1) for value in pattern):
                parser.error(f"Row {line} has an indicator outside 0, 1, or -9.")
            if all(value == -9 for value in pattern):
                excluded += 1
            else:
                counts[pattern] += 1
    if not counts:
        parser.error("No records contain any observed indicators.")
    with args.output.open("x", encoding="ascii", newline="\n") as stream:
        for pattern, n in sorted(counts.items()):
            stream.write(" ".join(map(str, (*pattern, n))) + "\n")
    print(f"N={sum(counts.values())}; all six indicators missing={excluded}; patterns={len(counts)}")


if __name__ == "__main__":
    main()
