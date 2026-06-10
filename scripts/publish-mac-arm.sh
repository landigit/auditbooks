# #! /bin/zsh

set -e

# Check node and pnpm versions
pnpm_VERSION=$(pnpm --version)
if [ "$pnpm_VERSION" != "9.15.1" ]; then
  echo "Incorrect pnpm version: $pnpm_VERSION"
  exit 1
fi

# Source secrets
source .env.publish

# Create folder for the publish build
cd ../
rm -rf build_publish
mkdir build_publish
cd build_publish

# Clone and cd into books
git clone https://github.com/frappe/books --depth 1
cd books

# Copy creds to log_creds.txt
echo $ERR_LOG_KEY > log_creds.txt
echo $ERR_LOG_SECRET >> log_creds.txt
echo $ERR_LOG_URL >> log_creds.txt
echo $TELEMETRY_URL >> log_creds.txt


# Install Dependencies
pnpm install

# Set .env and build
export GH_TOKEN=$GH_TOKEN &&
 export CSC_IDENTITY_AUTO_DISCOVERY=true &&
 export APPLE_ID=$APPLE_ID &&
 export APPLE_TEAM_ID=$APPLE_TEAM_ID &&
 export APPLE_APP_SPECIFIC_PASSWORD=$APPLE_APP_SPECIFIC_PASSWORD &&
 pnpm build --mac --publish=always

cd ../books
