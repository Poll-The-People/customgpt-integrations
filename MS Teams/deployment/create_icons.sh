#!/bin/bash
# Create a simple colored square for color.png (192x192)
# Create a simple outline for outline.png (32x32)
# Using ImageMagick if available, otherwise provide instructions

if command -v convert &> /dev/null; then
    # Create color icon (192x192) - blue square with "CG" text
    convert -size 192x192 xc:'#0078D4' -fill white -gravity center -pointsize 80 -annotate +0+0 'CG' color.png
    
    # Create outline icon (32x32) - simple outline
    convert -size 32x32 xc:transparent -fill none -stroke white -strokewidth 2 -draw "circle 16,16 16,4" -fill white -gravity center -pointsize 16 -annotate +0+0 'C' outline.png
    
    echo "Icons created successfully!"
else
    echo "ImageMagick not found. Please create icons manually."
fi
