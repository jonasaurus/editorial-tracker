import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // A self-contained server for the Docker image.
  output: 'standalone',
  // Next.js writes a managed block into AGENTS.md when it sees a coding
  // agent. AGENTS.md is curated by hand, so this is off.
  agentRules: false,
  experimental: {
    // Upgrades follow the release-age rule and `pnpm audit`, not this nudge.
    agentUpgrade: false,
  },
  webpack: (webpackConfig: { resolve: { extensionAlias?: Record<string, string[]> } }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
