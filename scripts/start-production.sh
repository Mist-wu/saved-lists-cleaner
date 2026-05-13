#!/usr/bin/env sh
set -eu

npx prisma db push --skip-generate
exec npm run start
