interface PullRequestDetails {
  diff: string;
  title: string;
  number: number;
  repository: string;
}

export async function fetchPullRequestDiff(prUrl: string): Promise<PullRequestDetails> {
  // PR URL formátum: https://github.com/owner/repo/pull/number
  const urlParts = prUrl.split('/')
  const prNumber = urlParts[urlParts.length - 1]
  const repo = urlParts[urlParts.length - 3]
  const owner = urlParts[urlParts.length - 4]

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
  
  const headers = {
    'Accept': 'application/vnd.github.v3.diff',
    'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28'
  }

  try {
    // Lekérjük a PR adatait
    const prResponse = await fetch(apiUrl, {
      headers: { ...headers, 'Accept': 'application/json' }
    })
    
    if (!prResponse.ok) {
      throw new Error(`GitHub API error: ${prResponse.statusText}`)
    }
    
    const prData = await prResponse.json()

    // Lekérjük a diff-et
    const diffResponse = await fetch(apiUrl, {
      headers: { ...headers, 'Accept': 'application/vnd.github.v3.diff' }
    })
    
    if (!diffResponse.ok) {
      throw new Error(`GitHub API error: ${diffResponse.statusText}`)
    }

    const diff = await diffResponse.text()

    return {
      diff,
      title: prData.title,
      number: prData.number,
      repository: `${owner}/${repo}`
    }
  } catch (error) {
    console.error('Error fetching PR diff:', error)
    throw error
  }
}