"""
Confluence API Client for Teams Bot Integration
Supports both Cloud and Server/Data Center deployments
"""

import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import aiohttp
import base64
from urllib.parse import urljoin, quote

logger = logging.getLogger(__name__)


class ConfluenceClient:
    """Async client for Confluence REST API"""

    def __init__(
        self,
        base_url: str,
        username: Optional[str] = None,
        api_token: Optional[str] = None,
        access_token: Optional[str] = None,
        is_cloud: bool = True
    ):
        """
        Initialize Confluence client

        Args:
            base_url: Confluence instance URL (e.g., 'https://your-domain.atlassian.net')
            username: Email for Cloud or username for Server (used with api_token)
            api_token: API token for authentication
            access_token: OAuth 2.0 access token (alternative to username/api_token)
            is_cloud: True for Cloud, False for Server/Data Center
        """
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.api_token = api_token
        self.access_token = access_token
        self.is_cloud = is_cloud

        # API endpoints differ between Cloud and Server
        if is_cloud:
            self.api_base = f"{self.base_url}/wiki/rest/api"
            self.api_v2 = f"{self.base_url}/wiki/api/v2"
        else:
            self.api_base = f"{self.base_url}/rest/api"
            self.api_v2 = f"{self.base_url}/rest/api"  # V2 API not always available on Server

        self._session: Optional[aiohttp.ClientSession] = None
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 300  # 5 minutes

    async def _ensure_session(self):
        """Ensure HTTP session exists"""
        if self._session is None or self._session.closed:
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }

            # Add authentication header
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'
            elif self.username and self.api_token:
                auth_string = f"{self.username}:{self.api_token}"
                auth_bytes = auth_string.encode('utf-8')
                auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
                headers['Authorization'] = f'Basic {auth_b64}'
            else:
                raise ValueError("Either access_token or username+api_token must be provided")

            self._session = aiohttp.ClientSession(headers=headers)

    async def close(self):
        """Close HTTP session"""
        if self._session and not self._session.closed:
            await self._session.close()

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        use_v2: bool = False
    ) -> Dict[str, Any]:
        """Make HTTP request to Confluence API"""
        await self._ensure_session()

        base = self.api_v2 if use_v2 else self.api_base
        url = urljoin(base, endpoint)

        try:
            async with self._session.request(
                method,
                url,
                params=params,
                json=data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 401:
                    raise Exception("Authentication failed. Check credentials.")
                elif response.status == 403:
                    raise Exception("Access denied. Check permissions.")
                elif response.status == 404:
                    raise Exception(f"Resource not found: {endpoint}")
                elif response.status >= 400:
                    error_text = await response.text()
                    raise Exception(f"API error ({response.status}): {error_text}")

                return await response.json()

        except asyncio.TimeoutError:
            raise Exception("Request to Confluence API timed out")
        except aiohttp.ClientError as e:
            raise Exception(f"Network error: {str(e)}")

    async def search_content(
        self,
        cql: str,
        limit: int = 25,
        start: int = 0,
        expand: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Search content using CQL (Confluence Query Language)

        Args:
            cql: CQL query string (e.g., "text ~ 'search term' AND type=page")
            limit: Maximum results to return (max 1000)
            start: Pagination offset
            expand: Fields to expand (body.storage, version, space, etc.)

        Returns:
            Dict with 'results' array and pagination info
        """
        params = {
            'cql': cql,
            'limit': min(limit, 1000),
            'start': start
        }

        if expand:
            params['expand'] = ','.join(expand)

        # Check cache
        cache_key = f"search:{cql}:{start}:{limit}"
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if (datetime.now() - timestamp).seconds < self._cache_ttl:
                logger.debug(f"Using cached search results for: {cql}")
                return cached_data

        result = await self._request('GET', '/search', params=params)

        # Cache result
        self._cache[cache_key] = (result, datetime.now())

        return result

    async def search_by_text(
        self,
        query: str,
        space_key: Optional[str] = None,
        content_type: str = 'page',
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Simple text search across Confluence content

        Args:
            query: Search text
            space_key: Limit to specific space (optional)
            content_type: Type of content (page, blogpost, attachment)
            limit: Max results

        Returns:
            List of matching content items
        """
        # Build CQL query
        cql_parts = [f"text ~ '{query}'", f"type={content_type}"]

        if space_key:
            cql_parts.append(f"space='{space_key}'")

        cql = ' AND '.join(cql_parts)

        result = await self.search_content(
            cql=cql,
            limit=limit,
            expand=['body.storage', 'space', 'version', 'history.lastUpdated']
        )

        return result.get('results', [])

    async def get_page_by_id(
        self,
        page_id: str,
        expand: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get page by ID

        Args:
            page_id: Confluence page ID
            expand: Fields to expand

        Returns:
            Page data
        """
        params = {}
        if expand:
            params['expand'] = ','.join(expand)

        return await self._request('GET', f'/content/{page_id}', params=params)

    async def get_page_by_title(
        self,
        title: str,
        space_key: str,
        expand: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get page by title in a specific space

        Args:
            title: Page title
            space_key: Space key
            expand: Fields to expand

        Returns:
            Page data or None if not found
        """
        params = {
            'spaceKey': space_key,
            'title': title
        }

        if expand:
            params['expand'] = ','.join(expand)

        result = await self._request('GET', '/content', params=params)
        results = result.get('results', [])

        return results[0] if results else None

    async def get_space_info(self, space_key: str) -> Dict[str, Any]:
        """Get space information"""
        return await self._request('GET', f'/space/{space_key}')

    async def get_spaces(self, limit: int = 25) -> List[Dict[str, Any]]:
        """Get list of spaces user has access to"""
        result = await self._request('GET', '/space', params={'limit': limit})
        return result.get('results', [])

    async def get_page_children(
        self,
        page_id: str,
        expand: Optional[List[str]] = None,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """Get child pages of a page"""
        params = {'limit': limit}
        if expand:
            params['expand'] = ','.join(expand)

        result = await self._request(
            'GET',
            f'/content/{page_id}/child/page',
            params=params
        )
        return result.get('results', [])

    async def get_page_attachments(
        self,
        page_id: str,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """Get attachments for a page"""
        result = await self._request(
            'GET',
            f'/content/{page_id}/child/attachment',
            params={'limit': limit}
        )
        return result.get('results', [])

    async def get_recent_content(
        self,
        space_key: Optional[str] = None,
        limit: int = 10,
        content_type: str = 'page'
    ) -> List[Dict[str, Any]]:
        """
        Get recently updated content

        Args:
            space_key: Limit to specific space
            limit: Max results
            content_type: Type of content

        Returns:
            List of recently updated content
        """
        cql_parts = [f"type={content_type}", "order by lastmodified desc"]

        if space_key:
            cql_parts.insert(0, f"space='{space_key}'")

        cql = ' AND '.join(cql_parts)

        result = await self.search_content(
            cql=cql,
            limit=limit,
            expand=['body.storage', 'space', 'version', 'history.lastUpdated']
        )

        return result.get('results', [])

    def extract_text_from_content(self, content: Dict[str, Any]) -> str:
        """
        Extract plain text from Confluence content

        Args:
            content: Content object with body.storage

        Returns:
            Extracted text
        """
        body = content.get('body', {}).get('storage', {}).get('value', '')

        # Basic HTML tag stripping (for simple cases)
        # For production, use a proper HTML parser like BeautifulSoup
        import re
        text = re.sub(r'<[^>]+>', '', body)
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def format_content_for_teams(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format Confluence content for Teams display

        Args:
            content: Confluence content object

        Returns:
            Formatted data for Teams cards
        """
        space = content.get('space', {})
        history = content.get('history', {})
        last_updated = history.get('lastUpdated', {})

        # Build web URL
        web_url = f"{self.base_url}/wiki{content.get('_links', {}).get('webui', '')}"

        return {
            'title': content.get('title', 'Untitled'),
            'excerpt': self.extract_text_from_content(content)[:200] + '...',
            'space_name': space.get('name', 'Unknown'),
            'space_key': space.get('key', ''),
            'url': web_url,
            'last_updated': last_updated.get('when', ''),
            'last_updated_by': last_updated.get('by', {}).get('displayName', 'Unknown'),
            'content_type': content.get('type', 'page'),
            'id': content.get('id')
        }
