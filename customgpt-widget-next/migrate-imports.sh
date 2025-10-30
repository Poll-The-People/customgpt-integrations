#!/bin/bash

# Script to update all imports from relative to @/ alias and add 'use client' where needed

echo "🔄 Migrating imports to Next.js format..."

# Files that need 'use client' directive
CLIENT_FILES=(
  "src/components/AvatarMode.tsx"
  "src/components/ChatContainer.tsx"
  "src/components/ModeToggleMenu.tsx"
  "src/hooks/useTalkingHead.ts"
  "src/hooks/useTTS.ts"
  "src/hooks/useMicVADWrapper.ts"
  "src/hooks/useCapabilities.ts"
  "src/hooks/useAgentSettings.ts"
)

# Add 'use client' to top of files if not already present
for file in "${CLIENT_FILES[@]}"; do
  if [ -f "$file" ]; then
    if ! grep -q "'use client'" "$file"; then
      echo "Adding 'use client' to $file"
      echo -e "'use client';\n\n$(cat $file)" > "$file"
    fi
  fi
done

# Update all relative imports to @/ alias in src directory
echo "Updating imports to use @/ alias..."

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|from ['\"]\.\.\/components\/|from '@/components/|g" \
  -e "s|from ['\"]\.\.\/hooks\/|from '@/hooks/|g" \
  -e "s|from ['\"]\.\.\/utils\/|from '@/utils/|g" \
  -e "s|from ['\"]\.\.\/lib\/|from '@/lib/|g" \
  -e "s|from ['\"]\.\.\/types\/|from '@/types/|g" \
  -e "s|from ['\"]\.\/|from '@/components/|g" \
  -e "s|\.\.\/particle-manager\.ts|@/lib/particle-manager|g" \
  -e "s|\.\.\/speech-manager-optimized\.ts|@/lib/speech-manager|g" \
  -e "s|\.\.\/Canvas\.tsx|@/components/Canvas|g" \
  {} \;

echo "✅ Import migration complete!"
echo ""
echo "Next steps:"
echo "1. Copy Canvas.tsx if it exists"
echo "2. Update API endpoint URLs"
echo "3. Test with: npm run dev"
