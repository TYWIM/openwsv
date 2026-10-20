#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenWSV Benchmark - Fast Test Runner
Usage:
    python run_eval.py run --model starlife-1-wsv
    python run_eval.py compare --models starlife-1-wsv,starlife-1-wsv-lite,gemini-2.0-pro,gpt-5-omni
"""

import sys
from openwsv_eval.cli import main

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # Default run StarLife-1-WSV model
        sys.argv.extend(["run", "--model", "starlife-1-wsv"])
    main()
