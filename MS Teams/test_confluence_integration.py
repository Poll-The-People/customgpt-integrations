"""
Test script for Confluence integration
Run this to verify your Confluence setup before deploying the bot
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


async def test_confluence_integration():
    """Test Confluence client connectivity and basic operations"""

    print("=" * 60)
    print("Confluence Integration Test")
    print("=" * 60)

    # Check if Confluence is enabled
    confluence_enabled = os.getenv('CONFLUENCE_ENABLED', 'false').lower() == 'true'

    if not confluence_enabled:
        print("\n❌ CONFLUENCE_ENABLED is not set to true")
        print("Set CONFLUENCE_ENABLED=true in your .env file to enable integration")
        return False

    print("\n✅ Confluence integration is enabled")

    # Check required configuration
    base_url = os.getenv('CONFLUENCE_BASE_URL')
    username = os.getenv('CONFLUENCE_USERNAME')
    api_token = os.getenv('CONFLUENCE_API_TOKEN')
    access_token = os.getenv('CONFLUENCE_ACCESS_TOKEN')
    is_cloud = os.getenv('CONFLUENCE_IS_CLOUD', 'true').lower() == 'true'

    print(f"\nConfiguration:")
    print(f"  Base URL: {base_url if base_url else '❌ NOT SET'}")
    print(f"  Is Cloud: {is_cloud}")
    print(f"  Username: {username if username else '(not set)'}")
    print(f"  API Token: {'✓ Set' if api_token else '(not set)'}")
    print(f"  Access Token: {'✓ Set' if access_token else '(not set)'}")

    # Validate configuration
    if not base_url:
        print("\n❌ CONFLUENCE_BASE_URL is required")
        return False

    if not access_token and not (username and api_token):
        print("\n❌ Either CONFLUENCE_ACCESS_TOKEN or both CONFLUENCE_USERNAME and CONFLUENCE_API_TOKEN are required")
        return False

    # Import Confluence client
    try:
        from confluence_client import ConfluenceClient
    except ImportError as e:
        print(f"\n❌ Failed to import ConfluenceClient: {e}")
        return False

    print("\n✅ ConfluenceClient module imported successfully")

    # Initialize client
    try:
        client = ConfluenceClient(
            base_url=base_url,
            username=username,
            api_token=api_token,
            access_token=access_token,
            is_cloud=is_cloud
        )
        print("✅ ConfluenceClient initialized")
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        return False

    # Test 1: Get spaces
    print("\n" + "=" * 60)
    print("Test 1: Fetching accessible spaces")
    print("=" * 60)

    try:
        spaces = await client.get_spaces(limit=5)
        print(f"\n✅ Successfully fetched {len(spaces)} space(s)")

        if spaces:
            print("\nAccessible Spaces:")
            for space in spaces:
                print(f"  • {space.get('name')} ({space.get('key')})")
                print(f"    Type: {space.get('type', 'unknown')}")
        else:
            print("\n⚠️  No spaces found. This might indicate permission issues.")

    except Exception as e:
        print(f"\n❌ Failed to fetch spaces: {e}")
        await client.close()
        return False

    # Test 2: Search content
    print("\n" + "=" * 60)
    print("Test 2: Searching for content")
    print("=" * 60)

    test_query = "test"
    print(f"\nSearching for: '{test_query}'")

    try:
        results = await client.search_by_text(
            query=test_query,
            limit=3
        )

        print(f"✅ Search completed. Found {len(results)} result(s)")

        if results:
            print("\nSearch Results:")
            for idx, result in enumerate(results, 1):
                formatted = client.format_content_for_teams(result)
                print(f"\n  {idx}. {formatted['title']}")
                print(f"     Space: {formatted['space_name']}")
                print(f"     Type: {formatted['content_type']}")
                print(f"     URL: {formatted['url']}")
                print(f"     Excerpt: {formatted['excerpt'][:100]}...")
        else:
            print("\n⚠️  No results found for this query.")
            print("     Try a different search term or check space permissions.")

    except Exception as e:
        print(f"\n❌ Search failed: {e}")
        await client.close()
        return False

    # Test 3: Get recent content
    print("\n" + "=" * 60)
    print("Test 3: Fetching recent content")
    print("=" * 60)

    try:
        recent = await client.get_recent_content(limit=3)
        print(f"\n✅ Successfully fetched {len(recent)} recent item(s)")

        if recent:
            print("\nRecent Content:")
            for idx, item in enumerate(recent, 1):
                print(f"\n  {idx}. {item.get('title', 'Untitled')}")
                space = item.get('space', {})
                print(f"     Space: {space.get('name', 'Unknown')}")
                history = item.get('history', {}).get('lastUpdated', {})
                print(f"     Last updated: {history.get('when', 'Unknown')}")

    except Exception as e:
        print(f"\n❌ Failed to fetch recent content: {e}")
        await client.close()
        return False

    # Cleanup
    await client.close()
    print("\n" + "=" * 60)
    print("✅ All tests completed successfully!")
    print("=" * 60)
    print("\nYour Confluence integration is properly configured.")
    print("You can now enable it in your Teams bot.\n")

    return True


async def main():
    """Main test runner"""
    success = await test_confluence_integration()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
