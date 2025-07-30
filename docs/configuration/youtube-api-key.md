# YouTube API Key Setup Guide

This guide provides detailed instructions for obtaining and configuring a YouTube Data API v3 key for use with the
YouTube MCP Server.

## Getting Your API Key

1. **Go to Google Cloud Console**: Navigate to [console.developers.google.com](https://console.developers.google.com/).

2. **Create or Select a Project**:
   - If you don't have a project, create a new one.
   - If you have an existing project, select it.
   - **Important**: Ensure that billing is enabled for the project, as it is required for API usage.

3. **Enable the YouTube Data API**:
   - In the navigation menu, go to "APIs & Services" > "Library".
   - Search for "YouTube Data API v3".
   - Click on the API and then click the "Enable" button.

4. **Create Credentials**:
   - Go to "APIs & Services" > "Credentials".
   - Click on "Create Credentials" and select "API Key".
   - Your API key will be generated. Copy it to a safe place.

5. **Restrict Your API Key (Recommended)**:
   - In the credentials list, click on the name of your newly created API key to edit its settings.
   - Under "Application restrictions", you can restrict the key to specific IP addresses or HTTP referrers for better
     security.
   - Under "API restrictions", select "Restrict key" and choose "YouTube Data API v3" from the dropdown to ensure the key
     can only be used for this specific API.

## Setting the Environment Variable

To use the API key with the YouTube MCP Server, you need to set it as an environment variable.

### Option A: In MCP Client Settings (Recommended)

The most secure and straightforward method is to add the API key directly to your MCP client's configuration (e.g.,
Cline, Claude Desktop).

In your client's settings for the YouTube MCP Server, add an environment variable:

- **Key**: `YOUTUBE_API_KEY`
- **Value**: `your_api_key_here`

This keeps the key scoped to the server and avoids exposing it globally on your system.

#### Option B: System-wide Environment Variable

You can also set the API key as a system-wide environment variable.

**For macOS/Linux:**

Add the following line to your shell's profile file (e.g., `~/.bashrc`, `~/.zshrc`):

```bash
export YOUTUBE_API_KEY="your_api_key_here"
```

Remember to source the file (e.g., `source ~/.zshrc`) or restart your terminal for the changes to take effect.

**For Windows:**

You can set it through the system properties or temporarily in your terminal:

```powershell
$env:YOUTUBE_API_KEY="your_api_key_here"
```

## Verifying Your Setup

Once you have configured your API key, you can test it by running the server:

```bash
YOUTUBE_API_KEY="your_api_key_here" youtube-mcp-server
```

If the server starts up without any API key-related errors, your setup is correct. You can also use your MCP client to
call the `unified_search` tool to confirm that the API key is working.

## Local Development & Testing

For developers who want to avoid setting environment variables repeatedly during local testing, you can use a file-based
configuration approach.

### File-Based Configuration

1. **Create the local configuration file**:

   ```bash
   # Copy the template
   cp tests/youtube-api.local.template.json tests/youtube-api.local.json
   ```

2. **Edit the file with your API key**:

   ```json
   {
     "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
   }
   ```

3. **Run tests normally**:

   ```bash
   npm test
   ```

### Important Security Notes

- ⚠️ **Never commit** `tests/youtube-api.local.json` to version control
- ✅ This file is automatically excluded by `.gitignore`
- 📁 The template file (`youtube-api.local.template.json`) is safe to commit
- 🔒 This approach is for **local development only** - not for production or CI/CD

### How It Works

1. When tests run, `tests/setup.ts` checks for the `YOUTUBE_API_KEY` environment variable
2. If not found, it attempts to read `tests/youtube-api.local.json`
3. If the file exists and contains a valid `apiKey`, it sets the environment variable
4. Environment variables always take precedence over the local file

This fallback mechanism maintains full backward compatibility while providing a convenient alternative for local development.

## Troubleshooting

### Common Issues

1. **"API key not set" error**: Ensure the `YOUTUBE_API_KEY` environment variable is set correctly or create the local configuration file
2. **"Invalid API key" error**: Verify that your API key is correct and the YouTube Data API v3 is enabled in your Google Cloud project
3. **"Quota exceeded" error**: Check your API usage in the Google Cloud Console and ensure you haven't exceeded your daily quota
4. **"Billing not enabled" error**: Make sure billing is enabled for your Google Cloud project
