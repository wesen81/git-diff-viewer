interface PullRequestDetails {
  diff: string;
  title: string;
  number: number;
  repository: string;
}

export async function fetchPullRequestDiff(prUrl: string): Promise<PullRequestDetails> {
  // Support multiple Git platforms by parsing the URL
  const url = new URL(prUrl)
  const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0)
  
  // Handle different Git platforms
  let owner: string, repo: string, prNumber: string, apiBaseUrl: string
  
  if (url.hostname === 'github.com') {
    [owner, repo, , prNumber] = pathSegments
    apiBaseUrl = 'https://api.github.com'
  } else if (url.hostname === 'gitlab.com') {
    [owner, repo, , prNumber] = pathSegments
    apiBaseUrl = 'https://gitlab.com/api/v4'
  } else if (url.hostname === 'bitbucket.org') {
    [owner, repo, , , prNumber] = pathSegments
    apiBaseUrl = 'https://api.bitbucket.org/2.0'
  } else {
    throw new Error('Unsupported Git platform')
  }

  // Platform-specific API calls
  if (url.hostname === 'github.com') {
    return await fetchGitHubPR(apiBaseUrl, owner, repo, prNumber)
  } else if (url.hostname === 'gitlab.com') {
    return await fetchGitLabPR(apiBaseUrl, owner, repo, prNumber)
  } else if (url.hostname === 'bitbucket.org') {
    return await fetchBitbucketPR(apiBaseUrl, owner, repo, prNumber)
  }

  throw new Error('Failed to fetch PR details')
}

async function fetchGitHubPR(apiBaseUrl: string, owner: string, repo: string, prNumber: string): Promise<PullRequestDetails> {
  const apiUrl = `${apiBaseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`
  
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28'
  }

  try {
    // Fetch PR data
    const prResponse = await fetch(apiUrl, {
      headers: { ...headers, 'Accept': 'application/json' }
    })
    
    if (!prResponse.ok) {
      throw new Error(`GitHub API error: ${prResponse.statusText}`)
    }
    
    const prData = await prResponse.json()

    // Fetch diff
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
    console.error('Error fetching GitHub PR:', error)
    throw error
  }
}

async function fetchGitLabPR(apiBaseUrl: string, owner: string, repo: string, prNumber: string): Promise<PullRequestDetails> {
  const projectId = encodeURIComponent(`${owner}/${repo}`)
  const apiUrl = `${apiBaseUrl}/projects/${projectId}/merge_requests/${prNumber}`
  
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_GITLAB_TOKEN}`
  }

  try {
    // Fetch MR data
    const mrResponse = await fetch(apiUrl, { headers })
    if (!mrResponse.ok) {
      throw new Error(`GitLab API error: ${mrResponse.statusText}`)
    }
    const mrData = await mrResponse.json()

    // Fetch diff
    const diffResponse = await fetch(`${apiUrl}/changes`, { headers })
    if (!diffResponse.ok) {
      throw new Error(`GitLab API error: ${diffResponse.statusText}`)
    }
    const diffData = await diffResponse.json()

    return {
      diff: diffData.changes.map((change: any) => change.diff).join('\n'),
      title: mrData.title,
      number: mrData.iid,
      repository: `${owner}/${repo}`
    }
  } catch (error) {
    console.error('Error fetching GitLab MR:', error)
    throw error
  }
}

async function fetchBitbucketPR(apiBaseUrl: string, owner: string, repo: string, prNumber: string): Promise<PullRequestDetails> {
  const apiUrl = `${apiBaseUrl}/repositories/${owner}/${repo}/pullrequests/${prNumber}`
  
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_BITBUCKET_TOKEN}`
  }

  try {
    // Fetch PR data
    const prResponse = await fetch(apiUrl, { headers })
    if (!prResponse.ok) {
      throw new Error(`Bitbucket API error: ${prResponse.statusText}`)
    }
    const prData = await prResponse.json()

    // Fetch diff
    const diffResponse = await fetch(`${apiUrl}/diff`, { headers })
    if (!diffResponse.ok) {
      throw new Error(`Bitbucket API error: ${diffResponse.statusText}`)
    }
    const diff = await diffResponse.text()

    return {
      diff,
      title: prData.title,
      number: parseInt(prNumber),
      repository: `${owner}/${repo}`
    }
  } catch (error) {
    console.error('Error fetching Bitbucket PR:', error)
    throw error
  }
}