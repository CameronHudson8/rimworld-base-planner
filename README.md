# rimworld-base-planner
This tool optimizes a [Rimworld](https://rimworldgame.com/) base layout based on space needed for room types and available land.

# Setup

1. Install dependencies.
    ```
    npm ci
    ```

# Usage

1. Create a YAML file containing the rooms you want and the cells available.
    ```
    # example-base.yaml

    cells:
      - - usable: true
        - usable: false
        - usable: true
      - - usable: true
        - usable: false
        - usable: true
      - - usable: true
        - usable: true
        - usable: true
    rooms:
      - links:
          - name: kitchen
        name: dining-room
        size: 1
      - links:
          - name: dining-room
          - name: storage
        name: kitchen
        size: 1
      - links:
          - name: kitchen
        name: storage
        size: 2
    ```
1. Run the program.
    ```
    npx tsx main.ts
    ```
