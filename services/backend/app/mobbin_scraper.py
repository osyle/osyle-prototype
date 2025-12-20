"""
Mobbin Web Scraper - Playwright-based
Scrapes Mobbin.com for app data, screens, and flows
"""

import asyncio
from typing import List, Optional, Dict, Any
from playwright.async_api import async_playwright, Page, Browser
import json
import os
from datetime import datetime


class MobbinScraper:
    """Web scraper for Mobbin.com using Playwright"""
    
    def __init__(self, email: str, password: str):
        self.email = email
        self.password = password
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.is_logged_in = False
        
    async def __aenter__(self):
        await self.start()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def start(self):
        """Start browser and login"""
        playwright = await async_playwright().start()
        
        # Launch browser (headless for production)
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        # Create new page
        self.page = await self.browser.new_page()
        
        # Login
        await self.login()
        
    async def close(self):
        """Close browser"""
        if self.page:
            await self.page.close()
        if self.browser:
            await self.browser.close()
    
    async def login(self):
        """Login to Mobbin using direct email/password (not Google OAuth)"""
        print(f"Logging in to Mobbin as {self.email}...")
        
        # Go to login page with longer timeout
        await self.page.goto("https://mobbin.com/login", wait_until="domcontentloaded", timeout=60000)
        
        # Wait for page to fully load
        await asyncio.sleep(2)
        
        # DO NOT click "See other options" or "Continue with Google"
        # Instead, directly use the email input in the "OR" section at the bottom
        
        # Wait for the email input in the OR section to be visible
        await self.page.wait_for_selector('input[type="email"]', timeout=10000)
        
        # Fill in email
        print("Filling email in OR section (direct Mobbin login)...")
        await self.page.fill('input[type="email"]', self.email)
        await asyncio.sleep(1)
        
        # Click the black "Continue" button in the OR section (NOT pressing Enter)
        # This button should be directly below the email input
        print("Clicking Continue button in OR section...")
        try:
            # The Continue button in the OR section should be a submit button or nearby button
            # Try to find it by looking for a button near the email input
            continue_buttons = await self.page.query_selector_all('button:has-text("Continue")')
            
            # We want the Continue button in the OR section, not the "Continue with Google"
            # The OR section Continue button should be below the email input
            for btn in continue_buttons:
                btn_text = await btn.inner_text()
                # Make sure it's just "Continue", not "Continue with Google"
                if btn_text.strip() == "Continue":
                    print("✓ Found direct Continue button (not Google) - clicking...")
                    await btn.click()
                    break
            else:
                # Fallback: try submit button
                print("Trying form submit button...")
                await self.page.click('button[type="submit"]')
            
            await asyncio.sleep(3)
            
        except Exception as e:
            print(f"Error clicking Continue: {e}")
            # As absolute last resort, press Enter
            print("Fallback: pressing Enter...")
            await self.page.press('input[type="email"]', 'Enter')
            await asyncio.sleep(3)
        
        # Now we should be on Mobbin's password page (NOT Google OAuth)
        # Wait for password field to appear
        try:
            # Check URL to make sure we're still on mobbin.com
            current_url = self.page.url
            print(f"Current URL after email submit: {current_url}")
            
            if 'accounts.google.com' in current_url:
                raise Exception("ERROR: Redirected to Google OAuth! We want direct Mobbin login only.")
            
            # Wait for Mobbin's password field
            print("Waiting for Mobbin password field...")
            await self.page.wait_for_selector('input[type="password"]', timeout=10000)
            
            print("✓ Password field found - logging in...")
            await self.page.fill('input[type="password"]', self.password)
            await asyncio.sleep(1)
            
            # Click sign in / submit button
            try:
                # Try different button selectors
                signin = await self.page.query_selector('button:has-text("Sign in")')
                if signin:
                    await signin.click()
                else:
                    submit = await self.page.query_selector('button[type="submit"]')
                    if submit:
                        await submit.click()
                    else:
                        # Press Enter as fallback
                        await self.page.press('input[type="password"]', 'Enter')
            except Exception as e:
                print(f"Trying Enter on password field: {e}")
                await self.page.press('input[type="password"]', 'Enter')
            
            # Wait for successful login
            await asyncio.sleep(3)
            await self.page.wait_for_url("**/discover/**", timeout=30000)
            self.is_logged_in = True
            print("✓ Successfully logged in to Mobbin")
                    
        except Exception as e:
            print(f"⚠️ Error with password login: {e}")
            print("⚠️ Falling back to magic link")
            await self._wait_for_magic_link()
    
    async def _wait_for_magic_link(self):
        """Wait for user to click magic link"""
        print("⚠️ Magic link sent! Please check email and click the link.")
        print("   Waiting up to 5 minutes for you to verify...")
        
        # Wait for navigation to discover/browse page (after user clicks magic link)
        try:
            await self.page.wait_for_url("**/discover/**", timeout=300000)  # 5 min
            print("✓ Magic link verified!")
        except:
            try:
                await self.page.wait_for_url("**/browse/**", timeout=5000)
                print("✓ Magic link verified!")
            except:
                raise Exception("Magic link verification timeout - please click the link in your email")
        
        # Wait for successful login (browse page appears)
        try:
            await self.page.wait_for_url("**/discover/**", timeout=10000)
            self.is_logged_in = True
            print("✓ Successfully logged in to Mobbin")
        except:
            # Check if already on browse/discover page
            if "/discover/" in self.page.url or "/browse/" in self.page.url:
                self.is_logged_in = True
                print("✓ Successfully logged in to Mobbin")
            else:
                raise Exception("Failed to login - didn't reach browse page")
    
    async def get_apps(
        self, 
        platform: str = "ios",
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get apps from Mobbin
        
        Args:
            platform: "ios" or "android" 
            category: App category filter (optional)
            page: Page number (1-indexed)
            page_size: Number of apps per page
            
        Returns:
            List of app dictionaries
        """
        print(f"Fetching apps: platform={platform}, page={page}, size={page_size}")
        
        # Navigate to discover page
        url = f"https://mobbin.com/discover/apps/{platform}/latest"
        if category:
            url += f"?category={category}"
            
        print(f"Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # Wait a bit longer for JavaScript to render
        await asyncio.sleep(5)
        
        print(f"Current URL: {self.page.url}")
        
        # Take a screenshot to see what's on the page
        try:
            await self.page.screenshot(path="/tmp/mobbin_apps_page.png")
            print("✓ Screenshot saved to /tmp/mobbin_apps_page.png")
        except Exception as e:
            print(f"Could not take screenshot: {e}")
        
        # Debug: Print page content to understand structure
        page_html = await self.page.content()
        print(f"Page HTML length: {len(page_html)} chars")
        
        # Try to find ANY content first
        try:
            # Wait for any of these selectors (very broad)
            await self.page.wait_for_selector('a[href*="/apps/"], img, article, div', timeout=10000)
            print("✓ Found some content on page")
        except Exception as e:
            print(f"⚠️ Could not find any content: {e}")
            # Print first 1000 chars of HTML for debugging
            print(f"Page preview: {page_html[:1000]}")
        
        # Scroll to load more apps (infinite scroll)
        for i in range(page):
            print(f"Scrolling {i+1}/{page}...")
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(2)
        
        # Extract app data from the page using very broad selectors
        print("Extracting app data...")
        apps = await self.page.evaluate(f"""
            () => {{
                console.log('Starting app extraction...');
                
                // Try multiple strategies to find app elements
                let appElements = [];
                
                // Strategy 1: Look for links to actual apps (not discover/search pages)
                // Pattern: /apps/[app-name] but NOT /apps/ios or /apps/android
                const allLinks = document.querySelectorAll('a[href*="/apps/"]');
                console.log('Found total /apps/ links:', allLinks.length);
                
                const appLinks = Array.from(allLinks).filter(link => {{
                    const href = link.getAttribute('href') || '';
                    // Must match pattern: /apps/something where something is not 'ios', 'android', etc.
                    const match = href.match(/\\/apps\\/([^\\/\\?#]+)/);
                    if (match && match[1]) {{
                        const appId = match[1];
                        // Exclude navigation pages
                        return appId !== 'ios' && appId !== 'android' && !href.includes('/discover/') && !href.includes('/search/');
                    }}
                    return false;
                }});
                
                console.log('Found actual app links:', appLinks.length);
                
                if (appLinks.length > 0) {{
                    appLinks.forEach(link => {{
                        // Find the parent container
                        let container = link.closest('article, div[class*="card"], li, div[data-testid]');
                        if (!container) container = link.parentElement;
                        
                        if (container && !appElements.includes(container)) {{
                            appElements.push(container);
                        }}
                    }});
                }}
                
                // Strategy 2: If no links found, try data-testid/class selectors
                if (appElements.length === 0) {{
                    appElements = Array.from(document.querySelectorAll('article, [data-testid*="app"], [class*="app-card"], [class*="AppCard"]'));
                    console.log('Found via data-testid/class:', appElements.length);
                }}
                
                console.log('Total app elements found:', appElements.length);
                
                const apps = [];
                const seenIds = new Set();
                
                appElements.forEach((el, index) => {{
                    try {{
                        // Find link to actual app page
                        const linkEl = el.querySelector('a[href*="/apps/"]') || el.closest('a[href*="/apps/"]') || el.querySelector('a');
                        
                        if (linkEl) {{
                            const href = linkEl.getAttribute('href') || '';
                            
                            // Extract app ID from URL pattern /apps/[app-id]
                            const match = href.match(/\\/apps\\/([^\\/\\?#]+)/);
                            if (!match || !match[1]) return;
                            
                            const appId = match[1];
                            
                            // Skip if not a real app (navigation pages)
                            if (appId === 'ios' || appId === 'android' || seenIds.has(appId)) return;
                            seenIds.add(appId);
                            
                            // Find name (try multiple selectors)
                            const nameEl = el.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
                            
                            // Find image
                            const imgEl = el.querySelector('img');
                            
                            apps.push({{
                                id: appId,
                                name: nameEl ? nameEl.textContent.trim() : appId,
                                logo_url: imgEl ? imgEl.src : null,
                                category: null,
                                url: href.startsWith('http') ? href : 'https://mobbin.com' + href,
                                platform: '{platform}'
                            }});
                        }}
                    }} catch (e) {{
                        console.error('Error parsing app element:', e);
                    }}
                }});
                
                console.log('Extracted apps:', apps.length);
                return apps;
            }}
        """)
        
        print(f"✓ Extracted {len(apps)} apps from page")
        
        # Paginate results
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return apps[start_idx:end_idx]
    
    async def get_app_screens(
        self, 
        app_id: str,
        version_id: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get screens for a specific app
        
        Args:
            app_id: App identifier (full slug like "instagram-ios-3aa6c4a6...")
            version_id: Specific version ID (optional, uses latest if not provided)
            limit: Maximum number of screens to return (optional)
            
        Returns:
            List of screen dictionaries with images and metadata
        """
        print(f"Fetching screens for app: {app_id}")
        
        # Navigate to app screens page
        if version_id:
            url = f"https://mobbin.com/apps/{app_id}/{version_id}/screens"
        else:
            # Try to get latest version screens
            url = f"https://mobbin.com/apps/{app_id}"
            await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(2)
            
            # Try to find and click the Screens tab or navigate directly
            try:
                # Look for version ID in current URL or page content
                current_url = self.page.url
                if "/apps/" in current_url:
                    parts = current_url.split('/')
                    if len(parts) >= 5:
                        version_id = parts[4]
                        url = f"https://mobbin.com/apps/{app_id}/{version_id}/screens"
                    else:
                        # Fallback: add /screens to current URL
                        url = current_url.rstrip('/') + '/screens'
            except Exception as e:
                print(f"Error extracting version ID: {e}")
                url = f"https://mobbin.com/apps/{app_id}/screens"
        
        print(f"Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)  # Wait for screens to load
        
        # Take screenshot for debugging
        try:
            await self.page.screenshot(path=f"/tmp/mobbin_screens_{app_id}.png")
            print(f"✓ Screenshot saved")
        except:
            pass
        
        # Extract screen data
        screens = await self.page.evaluate("""
            () => {
                const screens = [];
                let screenIndex = 0;
                
                // Try multiple selectors for screen images
                const selectors = [
                    'img[src*="mobbin"]',
                    'img[alt*="screen"]',
                    '[data-testid*="screen"] img',
                    'article img',
                    '.screen img',
                    'img'
                ];
                
                let screenElements = [];
                for (const selector of selectors) {
                    screenElements = Array.from(document.querySelectorAll(selector));
                    if (screenElements.length > 0) {
                        console.log(`Found ${screenElements.length} screens with selector: ${selector}`);
                        break;
                    }
                }
                
                // Filter to only screen images (not logos, icons, etc.)
                screenElements = screenElements.filter(img => {
                    const src = img.src || '';
                    const alt = img.alt || '';
                    const width = img.naturalWidth || img.width;
                    const height = img.naturalHeight || img.height;
                    
                    // Skip small images (likely icons/logos)
                    if (width < 100 || height < 100) return false;
                    
                    // Prefer images with "screen" in src or alt
                    return src.includes('mobbin') || alt.toLowerCase().includes('screen');
                });
                
                screenElements.forEach((img) => {
                    try {
                        const imgUrl = img.src;
                        
                        if (imgUrl && !imgUrl.includes('logo')) {
                            // Try to get associated metadata
                            const parent = img.closest('article, div[class*="card"], div[class*="screen"]');
                            let title = null;
                            let tags = [];
                            
                            if (parent) {
                                const titleEl = parent.querySelector('h3, h4, h5, [class*="title"]');
                                if (titleEl) {
                                    title = titleEl.textContent.trim();
                                }
                                
                                // Extract tags/labels
                                const tagElements = parent.querySelectorAll('[class*="tag"], [class*="label"], [class*="badge"]');
                                tags = Array.from(tagElements).map(t => t.textContent.trim()).filter(Boolean);
                            }
                            
                            screens.push({
                                id: `screen_${screenIndex}`,
                                screen_number: screenIndex + 1,
                                image_url: imgUrl,
                                thumbnail_url: imgUrl,
                                title: title,
                                tags: tags.length > 0 ? tags : null
                            });
                            
                            screenIndex++;
                        }
                    } catch (e) {
                        console.error('Error parsing screen element:', e);
                    }
                });
                
                console.log(`Extracted ${screens.length} screens`);
                return screens;
            }
        """)
        
        print(f"✓ Extracted {len(screens)} screens")
        
        if limit and len(screens) > limit:
            screens = screens[:limit]
        
        return screens
    
    async def get_app_flows(
        self,
        app_id: str,
        version_id: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get flows for a specific app
        
        Args:
            app_id: App identifier (slug)
            version_id: Specific version ID (optional)
            limit: Maximum number of flows to return (optional)
            
        Returns:
            List of flow dictionaries with metadata
        """
        print(f"Fetching flows for app: {app_id}")
        
        # Navigate to app flows page
        if version_id:
            url = f"https://mobbin.com/apps/{app_id}/{version_id}/flows"
        else:
            # Try to get latest version
            url = f"https://mobbin.com/apps/{app_id}"
            await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(2)
            
            # Extract version ID from URL
            try:
                current_url = self.page.url
                if "/apps/" in current_url:
                    parts = current_url.split('/')
                    if len(parts) >= 5:
                        version_id = parts[4]
                        url = f"https://mobbin.com/apps/{app_id}/{version_id}/flows"
                    else:
                        url = current_url.rstrip('/') + '/flows'
            except:
                url = f"https://mobbin.com/apps/{app_id}/flows"
            
        print(f"Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)
        
        # Extract flow data
        flows = await self.page.evaluate("""
            () => {
                const flows = [];
                let flowIndex = 0;
                
                // Try multiple selectors for flow cards
                const selectors = [
                    '[data-testid="flow-card"]',
                    '.flow-card',
                    'article a[href*="/flows/"]',
                    'a[href*="/flows/"]'
                ];
                
                let flowElements = [];
                for (const selector of selectors) {
                    flowElements = Array.from(document.querySelectorAll(selector));
                    if (flowElements.length > 0) {
                        console.log(`Found ${flowElements.length} flows with selector: ${selector}`);
                        break;
                    }
                }
                
                flowElements.forEach((el) => {
                    try {
                        // Find link
                        let linkEl = el.tagName === 'A' ? el : el.querySelector('a');
                        const href = linkEl ? linkEl.getAttribute('href') : null;
                        
                        if (!href || !href.includes('/flows/')) return;
                        
                        // Extract flow ID from URL
                        const flowId = href.split('/').pop() || `flow_${flowIndex}`;
                        
                        // Find title
                        const titleEl = el.querySelector('h3, h4, h5, [class*="title"], [class*="name"]');
                        const title = titleEl ? titleEl.textContent.trim() : `Flow ${flowIndex + 1}`;
                        
                        // Find thumbnail
                        const imgEl = el.querySelector('img');
                        const thumbnail = imgEl ? imgEl.src : null;
                        
                        // Try to find screen count or other metadata
                        const metaEl = el.querySelector('[class*="count"], [class*="meta"]');
                        const metadata = metaEl ? metaEl.textContent.trim() : null;
                        
                        // Extract tags
                        const tagElements = el.querySelectorAll('[class*="tag"], [class*="label"]');
                        const tags = Array.from(tagElements).map(t => t.textContent.trim()).filter(Boolean);
                        
                        flows.push({
                            id: flowId,
                            flow_number: flowIndex + 1,
                            title: title,
                            thumbnail_url: thumbnail,
                            url: href.startsWith('http') ? href : 'https://mobbin.com' + href,
                            metadata: metadata,
                            tags: tags.length > 0 ? tags : null
                        });
                        
                        flowIndex++;
                    } catch (e) {
                        console.error('Error parsing flow element:', e);
                    }
                });
                
                console.log(`Extracted ${flows.length} flows`);
                return flows;
            }
        """)
        
        print(f"✓ Extracted {len(flows)} flows")
        
        if limit and len(flows) > limit:
            flows = flows[:limit]
        
        return flows
    
    async def get_flow_details(
        self,
        app_id: str,
        version_id: str,
        flow_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed information about a specific flow including the flow tree
        
        Args:
            app_id: App identifier
            version_id: Version ID
            flow_id: Flow ID
            
        Returns:
            Dictionary with flow details including title, screens, and flow tree
        """
        print(f"Fetching flow details for: {flow_id}")
        
        # Navigate to specific flow page
        url = f"https://mobbin.com/apps/{app_id}/{version_id}/flows/{flow_id}"
        print(f"Navigating to: {url}")
        
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)
        
        # Take screenshot for debugging
        try:
            await self.page.screenshot(path=f"/tmp/mobbin_flow_{flow_id}.png")
            print(f"✓ Screenshot saved")
        except:
            pass
        
        # Extract flow details including tree structure
        flow_data = await self.page.evaluate("""
            () => {
                const data = {
                    title: null,
                    description: null,
                    screens: [],
                    flow_tree: null,
                    metadata: {}
                };
                
                // Get title
                const titleEl = document.querySelector('h1, h2, [class*="flow-title"]');
                if (titleEl) {
                    data.title = titleEl.textContent.trim();
                }
                
                // Get description
                const descEl = document.querySelector('p[class*="description"], [class*="subtitle"]');
                if (descEl) {
                    data.description = descEl.textContent.trim();
                }
                
                // Try to find flow tree/diagram data
                // Mobbin may store this in a data attribute or script tag
                const scriptTags = document.querySelectorAll('script');
                for (const script of scriptTags) {
                    const content = script.textContent || '';
                    // Look for flow data in JSON format
                    if (content.includes('flowData') || content.includes('flow_tree') || content.includes('"nodes"')) {
                        try {
                            // Try to extract JSON data
                            const match = content.match(/(\{[\s\S]*"nodes"[\s\S]*\})/);
                            if (match) {
                                data.flow_tree = JSON.parse(match[1]);
                            }
                        } catch (e) {
                            console.log('Could not parse flow tree JSON:', e);
                        }
                    }
                }
                
                // Get screen images in the flow
                const screenImgs = document.querySelectorAll('img[src*="mobbin"]');
                screenImgs.forEach((img, idx) => {
                    const width = img.naturalWidth || img.width;
                    const height = img.naturalHeight || img.height;
                    
                    // Filter to actual screens (not icons/logos)
                    if (width > 100 && height > 100) {
                        const parent = img.closest('div[class*="screen"], article');
                        let label = null;
                        
                        if (parent) {
                            const labelEl = parent.querySelector('[class*="label"], [class*="title"], figcaption');
                            if (labelEl) {
                                label = labelEl.textContent.trim();
                            }
                        }
                        
                        data.screens.push({
                            screen_number: idx + 1,
                            image_url: img.src,
                            label: label
                        });
                    }
                });
                
                // Try to extract metadata (tags, categories, etc.)
                const metaElements = document.querySelectorAll('[class*="tag"], [class*="category"], [class*="meta"]');
                const tags = [];
                metaElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text && text.length < 50) {
                        tags.push(text);
                    }
                });
                
                if (tags.length > 0) {
                    data.metadata.tags = tags;
                }
                
                console.log(`Extracted flow with ${data.screens.length} screens`);
                return data;
            }
        """)
        
        print(f"✓ Extracted flow details with {len(flow_data.get('screens', []))} screens")
        
        return flow_data
    
    async def get_flow_tree(
        self,
        app_id: str,
        version_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get the complete flow tree structure for an app
        
        Args:
            app_id: App identifier (full slug)
            version_id: Specific version ID (optional)
            
        Returns:
            Dictionary with flow tree nodes in hierarchical order
        """
        print(f"Fetching flow tree for app: {app_id}")
        
        # Construct URL for flows page
        if version_id:
            url = f"https://mobbin.com/apps/{app_id}/{version_id}/flows"
        else:
            url = f"https://mobbin.com/apps/{app_id}/flows"
        
        print(f"Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)
        
        # Extract tree structure
        tree_data = await self.page.evaluate("""
            () => {
                const nodes = [];
                
                // Find all tree nodes
                const treeNodes = document.querySelectorAll('li[data-tree-node-id]');
                
                console.log(`Found ${treeNodes.length} tree nodes`);
                
                treeNodes.forEach((node, index) => {
                    try {
                        const nodeId = node.getAttribute('data-tree-node-id');
                        
                        // Count depth by number of TreeNodeBranch divs
                        const branches = node.querySelectorAll('[class*="TreeNodeBranch"]');
                        const depth = branches.length;
                        
                        // Get title (usually in a text element)
                        let title = 'Untitled';
                        const textEl = node.querySelector('[class*="TreeNodeText"], [class*="text"]');
                        if (textEl) {
                            title = textEl.textContent.trim();
                        }
                        
                        // Get screen count (usually in a badge)
                        let screenCount = 0;
                        const badgeEl = node.querySelector('[class*="Badge"], [class*="count"]');
                        if (badgeEl) {
                            const countText = badgeEl.textContent.trim();
                            const match = countText.match(/\\d+/);
                            if (match) {
                                screenCount = parseInt(match[0]);
                            }
                        }
                        
                        // Check if has children
                        const hasChildren = node.querySelector('[class*="expand"], [class*="collapse"]') !== null;
                        
                        // Check if selected
                        const isSelected = node.classList.contains('selected') || 
                                         node.hasAttribute('aria-selected') ||
                                         node.querySelector('[class*="selected"]') !== null;
                        
                        nodes.push({
                            id: nodeId,
                            title: title,
                            screen_count: screenCount,
                            depth: depth,
                            has_children: hasChildren,
                            is_selected: isSelected,
                            order: index
                        });
                    } catch (e) {
                        console.error('Error parsing tree node:', e);
                    }
                });
                
                return nodes;
            }
        """)
        
        print(f"✓ Extracted {len(tree_data)} tree nodes")
        
        return {
            "app_id": app_id,
            "version_id": version_id,
            "nodes": tree_data,
            "total": len(tree_data)
        }
    
    async def get_flow_node_screens(
        self,
        app_id: str,
        version_id: str,
        node_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get screens for a specific flow tree node
        
        Args:
            app_id: App identifier (full slug)
            version_id: Version ID
            node_id: Flow tree node ID
            
        Returns:
            List of screen dictionaries with images and metadata
        """
        print(f"Fetching screens for flow node: {node_id}")
        
        # Navigate to flows page
        url = f"https://mobbin.com/apps/{app_id}/{version_id}/flows"
        print(f"Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(2)
        
        # Click the specific node
        print(f"Clicking node: {node_id}")
        await self.page.evaluate(f"""
            () => {{
                const node = document.querySelector('li[data-tree-node-id="{node_id}"]');
                if (node) {{
                    node.click();
                }} else {{
                    console.error('Node not found: {node_id}');
                }}
            }}
        """)
        
        # Wait for screens to load
        await asyncio.sleep(3)
        
        # Scroll to load lazy images
        await self.page.evaluate("""
            async () => {
                const scrollHeight = document.body.scrollHeight;
                const viewportHeight = window.innerHeight;
                const scrollStep = viewportHeight / 3;
                
                for (let y = 0; y < scrollHeight; y += scrollStep) {
                    window.scrollTo(0, y);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                window.scrollTo(0, 0);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        """)
        
        # Extract screens
        screens = await self.page.evaluate("""
            () => {
                const screens = [];
                const seenIds = new Set();
                
                // Find all image elements
                const imgs = document.querySelectorAll('img[src*="mobbin"]');
                
                imgs.forEach((img, idx) => {
                    try {
                        const width = img.naturalWidth || img.width;
                        const height = img.naturalHeight || img.height;
                        
                        // Filter: minimum size and portrait aspect ratio
                        if (width < 150 || height < 200) return;
                        if (height / width < 1.3) return; // Must be portrait
                        
                        // Filter: skip logos/icons/avatars by URL
                        const src = img.src.toLowerCase();
                        if (src.includes('logo') || src.includes('icon') || src.includes('avatar')) return;
                        
                        // Avoid duplicates
                        if (seenIds.has(img.src)) return;
                        seenIds.add(img.src);
                        
                        // Get label from nearby text
                        let label = null;
                        const parent = img.closest('div, article, figure');
                        if (parent) {
                            const labelEl = parent.querySelector('[class*="label"], figcaption, [class*="title"]');
                            if (labelEl) {
                                label = labelEl.textContent.trim();
                            }
                        }
                        
                        screens.push({
                            id: `screen-${idx}`,
                            screen_number: screens.length + 1,
                            image_url: img.src,
                            thumbnail_url: img.src,
                            label: label,
                            dimensions: { width: width, height: height }
                        });
                    } catch (e) {
                        console.error('Error processing image:', e);
                    }
                });
                
                return screens;
            }
        """)
        
        print(f"✓ Extracted {len(screens)} screens for node {node_id}")
        
        return screens
    
    async def get_app_ui_elements(
        self,
        app_id: str,
        version_id: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get UI elements for a specific app
        
        Args:
            app_id: App identifier (full slug)
            version_id: Specific version ID (optional)
            limit: Maximum number of elements to return (optional)
            
        Returns:
            List of UI element dictionaries with images and metadata
        """
        print(f"Fetching UI elements for app: {app_id}")
        
        # Navigate to UI elements page
        if version_id:
            url = f"https://mobbin.com/apps/{app_id}/{version_id}/ui-elements"
        else:
            # Try to get latest version
            url = f"https://mobbin.com/apps/{app_id}"
            await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(2)
            
            # Extract version ID from URL
            try:
                current_url = self.page.url
                if "/apps/" in current_url:
                    parts = current_url.split('/')
                    if len(parts) >= 5:
                        version_id = parts[4]
                        url = f"https://mobbin.com/apps/{app_id}/{version_id}/ui-elements"
                    else:
                        url = current_url.rstrip('/') + '/ui-elements'
            except:
                url = f"https://mobbin.com/apps/{app_id}/ui-elements"
        
        print(f"Navigating to: {url}")
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)
        
        # Extract UI element data
        elements = await self.page.evaluate("""
            () => {
                const elements = [];
                let elementIndex = 0;
                
                // Try multiple selectors for UI element cards/images
                const selectors = [
                    '[data-testid*="element"] img',
                    'article img',
                    '.element img',
                    'img[src*="mobbin"]'
                ];
                
                let elementImgs = [];
                for (const selector of selectors) {
                    elementImgs = Array.from(document.querySelectorAll(selector));
                    if (elementImgs.length > 0) {
                        console.log(`Found ${elementImgs.length} UI elements with selector: ${selector}`);
                        break;
                    }
                }
                
                // Filter to meaningful images
                elementImgs = elementImgs.filter(img => {
                    const width = img.naturalWidth || img.width;
                    const height = img.naturalHeight || img.height;
                    return width > 50 && height > 50;
                });
                
                elementImgs.forEach((img) => {
                    try {
                        const imgUrl = img.src;
                        
                        if (imgUrl) {
                            const parent = img.closest('article, div[class*="card"], div[class*="element"]');
                            let title = null;
                            let category = null;
                            let tags = [];
                            
                            if (parent) {
                                const titleEl = parent.querySelector('h3, h4, h5, [class*="title"]');
                                if (titleEl) {
                                    title = titleEl.textContent.trim();
                                }
                                
                                const categoryEl = parent.querySelector('[class*="category"], [class*="type"]');
                                if (categoryEl) {
                                    category = categoryEl.textContent.trim();
                                }
                                
                                const tagElements = parent.querySelectorAll('[class*="tag"], [class*="label"]');
                                tags = Array.from(tagElements).map(t => t.textContent.trim()).filter(Boolean);
                            }
                            
                            elements.push({
                                id: `element_${elementIndex}`,
                                element_number: elementIndex + 1,
                                image_url: imgUrl,
                                thumbnail_url: imgUrl,
                                title: title,
                                category: category,
                                tags: tags.length > 0 ? tags : null
                            });
                            
                            elementIndex++;
                        }
                    } catch (e) {
                        console.error('Error parsing UI element:', e);
                    }
                });
                
                console.log(`Extracted ${elements.length} UI elements`);
                return elements;
            }
        """)
        
        print(f"✓ Extracted {len(elements)} UI elements")
        
        if limit and len(elements) > limit:
            elements = elements[:limit]
        
        return elements
    
    async def search_apps(self, query: str, platform: str = "ios", content_type: str = "apps") -> List[Dict[str, Any]]:
        """
        Search for apps on Mobbin
        
        Args:
            query: Search query string (e.g., "instagram", "uber")
            platform: Platform to search (ios or android)
            content_type: Type of content to search (apps, screens, ui-elements, flows)
            
        Returns:
            List of matching apps with metadata
        """
        print(f"Searching Mobbin for '{query}' on {platform} (content_type: {content_type})...")
        
        # For app search, we need to use the search page with content_type=apps
        # The browse page doesn't actually filter by search query
        if content_type == "apps":
            search_url = f"https://mobbin.com/search/apps/{platform}?content_type=apps&q={query}"
        else:
            # For screens/ui-elements/flows, use the same search endpoint
            search_url = f"https://mobbin.com/search/apps/{platform}?content_type={content_type}&q={query}"
        
        print(f"Navigating to: {search_url}")
        await self.page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        
        # Dismiss any modal popups (like "New device detected")
        try:
            await asyncio.sleep(2)  # Wait for modal to appear
            # Try to find and click Skip/Close button
            skip_buttons = await self.page.query_selector_all('button:has-text("Skip"), button:has-text("Close"), button[aria-label="Close"]')
            if skip_buttons:
                print("Found modal popup - dismissing...")
                await skip_buttons[0].click()
                await asyncio.sleep(1)
                
                # Check if we got redirected to a warning page
                current_url = self.page.url
                if '/concurrent/warn' in current_url or current_url != search_url:
                    print(f"Redirected to {current_url}, navigating back to search...")
                    await self.page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                    await asyncio.sleep(2)
        except Exception as e:
            print(f"No modal to dismiss or error dismissing: {e}")
        
        await asyncio.sleep(2)  # Wait for search results to load
        
        # Take screenshot for debugging
        try:
            await self.page.screenshot(path=f"/tmp/mobbin_search_{query}.png")
            print(f"✓ Search screenshot saved to /tmp/mobbin_search_{query}.png")
        except Exception as e:
            print(f"Could not take screenshot: {e}")
        
        # DEBUGGING: Save the full HTML content
        try:
            html_content = await self.page.content()
            html_path = f"/tmp/mobbin_search_{query}_full.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"✓ Full HTML saved to {html_path}")
            print(f"✓ Current URL: {self.page.url}")
        except Exception as e:
            print(f"Could not save HTML: {e}")
        
        # Check if we were redirected to a specific app page (direct match)
        current_url = self.page.url
        if '/apps/' in current_url and '/search/' not in current_url and content_type == "apps":
            print(f"Redirected to specific app: {current_url}")
            # Extract app info from the current page
            app_data = await self.page.evaluate("""
                () => {
                    const url = window.location.href;
                    const urlParts = url.split('/').filter(p => p);
                    const appsIndex = urlParts.indexOf('apps');
                    
                    if (appsIndex === -1 || appsIndex + 1 >= urlParts.length) return null;
                    
                    const appSlug = urlParts[appsIndex + 1];
                    let versionId = null;
                    if (appsIndex + 2 < urlParts.length && !['screens', 'ui-elements', 'flows'].includes(urlParts[appsIndex + 2])) {
                        versionId = urlParts[appsIndex + 2];
                    }
                    
                    // Try to find app name and logo on the page
                    const nameEl = document.querySelector('h1, h2, [class*="app-name"], [class*="title"]');
                    const imgEl = document.querySelector('img[alt*="logo"], img[class*="logo"], .logo img, img');
                    
                    let appName = nameEl ? nameEl.textContent.trim() : appSlug;
                    
                    // Parse name from slug if needed
                    if (appName === appSlug) {
                        const match = appSlug.match(/^([a-z0-9-]+?)(?:-[a-f0-9]{8}-|$)/i);
                        if (match) {
                            appName = match[1].split('-').map(w => 
                                w.charAt(0).toUpperCase() + w.slice(1)
                            ).join(' ');
                        }
                    }
                    
                    return {
                        id: appSlug,
                        name: appName,
                        logo_url: imgEl ? imgEl.src : null,
                        platform: '""" + platform + """',
                        version_id: versionId,
                        url: url,
                        base_url: `https://mobbin.com/apps/${appSlug}`
                    };
                }
            """)
            
            if app_data:
                print(f"Extracted single app from redirect: {app_data['name']}")
                return [app_data]
        
        # Extract apps from search results
        # When content_type=apps, Mobbin shows screens with app attribution links at the bottom
        # We need to extract unique apps from these attribution links
        apps = await self.page.evaluate(f"""
            () => {{
                const apps = [];
                const seenIds = new Set();
                
                console.log('=== EXTRACTING APPS FROM SEARCH RESULTS ===');
                console.log('Current URL:', window.location.href);
                
                // On search results page, look for app attribution links
                // These appear at the bottom of each screen card
                // Format: <a href="/apps/instagram-ios-...">Instagram</a>
                
                // Find all links to apps within the results
                const appLinks = document.querySelectorAll('a[href*="/apps/"]:not([href*="/search/"]):not([href*="/discover/"])');
                console.log('Found ' + appLinks.length + ' app links');
                
                appLinks.forEach((link, idx) => {{
                    try {{
                        const href = link.getAttribute('href') || '';
                        
                        // Extract app slug from URL
                        const urlParts = href.split('/').filter(p => p);
                        const appsIndex = urlParts.indexOf('apps');
                        
                        if (appsIndex === -1 || appsIndex + 1 >= urlParts.length) {{
                            console.log('Link ' + idx + ': No app slug found');
                            return;
                        }}
                        
                        const appSlug = urlParts[appsIndex + 1];
                        
                        // Skip duplicates and platform names
                        if (seenIds.has(appSlug) || appSlug === 'ios' || appSlug === 'android' || appSlug === 'web') {{
                            return;
                        }}
                        
                        seenIds.add(appSlug);
                        
                        // Get app name from link text
                        let appName = link.textContent.trim();
                        
                        // If link text is empty or too long, parse from slug
                        if (!appName || appName.length > 100 || appName.length < 2) {{
                            const match = appSlug.match(/^([a-z0-9-]+?)(?:-[a-f0-9]{{8}}-|$)/i);
                            if (match) {{
                                appName = match[1].split('-').map(w => 
                                    w.charAt(0).toUpperCase() + w.slice(1)
                                ).join(' ');
                            }} else {{
                                appName = appSlug;
                            }}
                        }}
                        
                        console.log('Link ' + idx + ': Found app "' + appName + '" (slug: ' + appSlug + ')');
                        
                        // Try to find logo near this link
                        // Usually the logo is in a nearby element or parent container
                        let logoUrl = null;
                        const parent = link.closest('div, article, [class*="cell"]');
                        if (parent) {{
                            const imgEl = parent.querySelector('img[src*="logo"], img[alt*="logo"]');
                            if (imgEl) {{
                                logoUrl = imgEl.src;
                            }}
                        }}
                        
                        // If still no logo, look for any image in parent (might be the app logo)
                        if (!logoUrl && parent) {{
                            const imgs = parent.querySelectorAll('img');
                            // Find smallest image (likely the logo, not the screen)
                            let smallestImg = null;
                            let smallestSize = Infinity;
                            imgs.forEach(img => {{
                                const size = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
                                if (size < smallestSize && size > 100) {{ // Must be > 100 to avoid icons
                                    smallestSize = size;
                                    smallestImg = img;
                                }}
                            }});
                            if (smallestImg) logoUrl = smallestImg.src;
                        }}
                        
                        // Extract version ID if present
                        let versionId = null;
                        if (appsIndex + 2 < urlParts.length && !['screens', 'ui-elements', 'flows'].includes(urlParts[appsIndex + 2])) {{
                            versionId = urlParts[appsIndex + 2];
                        }}
                        
                        apps.push({{
                            id: appSlug,
                            name: appName,
                            logo_url: logoUrl,
                            platform: '{platform}',
                            version_id: versionId,
                            url: href.startsWith('http') ? href : 'https://mobbin.com' + href,
                            base_url: `https://mobbin.com/apps/${{appSlug}}`
                        }});
                    }} catch (e) {{
                        console.error(`Error parsing link ${{idx}}:`, e);
                    }}
                }});
                
                console.log('Extracted ' + apps.length + ' unique apps');
                return apps;
            }}
        """)
        
        print(f"✓ Found {len(apps)} apps matching '{query}'")
        
        # DEBUG: Print what we extracted
        print("="*70)
        print("EXTRACTED APPS:")
        for i, app in enumerate(apps):
            print(f"  {i+1}. {app.get('name')} (id: {app.get('id')})")
        print("="*70)
        
        return apps


# Example usage
async def main():
    email = os.getenv("MOBBIN_EMAIL", "your@email.com")
    password = os.getenv("MOBBIN_PASSWORD", "your_password")
    
    async with MobbinScraper(email, password) as scraper:
        # Get apps
        apps = await scraper.get_apps(platform="ios", page=1, page_size=5)
        print(f"\n✓ Found {len(apps)} apps:")
        for app in apps:
            print(f"  - {app['name']} ({app['id']})")
        
        # Get screens for first app
        if apps:
            screens = await scraper.get_app_screens(apps[0]['id'])
            print(f"\n✓ Found {len(screens)} screens for {apps[0]['name']}")


if __name__ == "__main__":
    asyncio.run(main())