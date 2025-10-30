/**
 * CustomGPT Widget Voice Assistant - Inline Embed Script
 * Embeds the voice assistant directly in the page flow (scrollable content)
 * Usage: Add <div id="customgpt-widget-embed"></div> where you want it to appear
 */

(function() {
    const config = {
        apiUrl: 'http://localhost:8000', // Change to deployed URL in production
        containerId: 'customgpt-widget-embed',
        height: '600px', // Adjust height as needed
        width: '100%',
        borderRadius: '12px'
    };

    // Find the container
    const container = document.getElementById(config.containerId);
    if (!container) {
        console.error(`CustomGPT Widget: Container #${config.containerId} not found`);
        return;
    }

    // Create wrapper with styling
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        width: ${config.width};
        height: ${config.height};
        border-radius: ${config.borderRadius};
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05);
        background: white;
        margin: 32px 0;
    `;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = config.apiUrl;
    iframe.allow = 'microphone';
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        display: block;
    `;

    // Loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #6b7280;
    `;
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">🎤</div>
            <div>Loading Voice Assistant...</div>
        </div>
    `;

    wrapper.style.position = 'relative';
    wrapper.appendChild(loadingDiv);
    wrapper.appendChild(iframe);

    // Remove loading indicator when iframe loads
    iframe.onload = () => {
        loadingDiv.style.display = 'none';
    };

    // Replace container content with wrapper
    container.innerHTML = '';
    container.appendChild(wrapper);

    console.log('✅ CustomGPT Widget Voice Assistant embedded successfully');
})();
