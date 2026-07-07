from __future__ import annotations

import json

from train_models import run_training


def main() -> None:
    print(json.dumps(run_training(save_outputs=False)))


if __name__ == "__main__":
    main()
