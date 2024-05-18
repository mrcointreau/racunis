#!/bin/bash

# Usage:
# ./docker_service_runner.sh <service_name> <command_to_run>

# Exit on error
set -e

# Determine the directory of this script
SCRIPT_DIR=$(dirname "$0")

# Read arguments
service_name="$1"
shift
command_to_run="$@"

# Determine cleanup directory based on service using a case statement
case "$service_name" in
  mysql)
    cleanup_path="$SCRIPT_DIR/.mysql"
    ;;
  postgresql)
    cleanup_path="$SCRIPT_DIR/.db_data"
    ;;
  *)
    echo "Invalid service name: $service_name" >&2
    exit 1
    ;;
esac

# Function to stop the Docker container and clean up the determined folder
cleanup() {
    echo "Stopping Docker container..."
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" down -v

    # Check if running in CI environment
    if [ -z "$CI" ]; then
        echo "Cleaning up ${cleanup_path} folder..."
        if [ -d "${cleanup_path}" ]; then
            rm -rf "${cleanup_path}"
            echo "${cleanup_path} folder removed."
        else
            echo "No ${cleanup_path} folder found."
        fi
    else
        echo "Skipping cleanup in CI environment."
    fi
}

# Trap any exit signal (success or failure)
trap cleanup EXIT

# Start the Docker container
echo "Starting Docker container..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d "${service_name}" --wait

# Run the provided command
echo "Running command: $command_to_run"
eval $command_to_run
