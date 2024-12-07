<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="header">
      <nav class="nav-container">
        <RouterLink to="/" class="logo">
          Git PR Viewer
        </RouterLink>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">
            Home
          </RouterLink>
          <RouterLink to="/about" class="nav-link">
            About
          </RouterLink>
        </div>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style lang="scss">
:root {
  --primary-color: #0969da;
  --primary-hover: #0550ae;
  --secondary-color: #24292f;
  --background-color: #ffffff;
  --surface-color: #f6f8fa;
  --border-color: #d0d7de;
  --text-color: #1F2328;
  --text-secondary: #656d76;
  --header-height: 64px;
  --hover-color: #f3f4f6;
  --active-color: #0969da;
  --shadow-color: rgba(31, 35, 40, 0.04);
  --link-color: #0969da;
  --error-color: #cf222e;
  --success-color: #1a7f37;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.5;
  font-size: 14px;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  width: 100%;
}

.header {
  height: var(--header-height);
  background-color: var(--background-color);
  border-bottom: 1px solid var(--border-color);
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 1px 2px var(--shadow-color);
  width: 100%;
}

.nav-container {
  width: 100%;
  height: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;

  .logo {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 6px;

    &:hover {
      color: var(--primary-color);
      background-color: var(--hover-color);
    }
  }

  .nav-links {
    display: flex;
    gap: 0.5rem;
    align-items: center;

    .nav-link {
      color: var(--text-color);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
      line-height: 20px;

      &.router-link-active {
        color: var(--primary-color);
        background-color: var(--surface-color);
        font-weight: 600;
      }

      &:hover:not(.router-link-active) {
        background-color: var(--hover-color);
        color: var(--primary-color);
      }
    }
  }
}

.router-view {
  margin-top: var(--header-height);
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  width: 100%;
}

// Alap elemek stílusai
button {
  font-family: inherit;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  appearance: none;
  user-select: none;
  text-decoration: none;
  text-align: center;
  transition: 0.2s cubic-bezier(0.3, 0, 0.5, 1);
}

input, select, textarea {
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  color: var(--text-color);
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  outline: none;
  padding: 5px 12px;
  transition: border-color 0.15s ease-in-out;

  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
  }
}

// Scrollbar testreszabása
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--surface-color);
  border-radius: 6px;
}

::-webkit-scrollbar-thumb {
  background: #d0d7de;
  border-radius: 6px;
  border: 2px solid var(--surface-color);

  &:hover {
    background: #959da5;
  }
}

// Kijelölés stílusa
::selection {
  background-color: #0366d625;
  color: var(--text-color);
}

// Linkek alapértelmezett stílusa
a {
  color: var(--link-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

// Tipográfia alapértékek
h1, h2, h3, h4, h5, h6 {
  margin-top: 0;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-color);
}

p {
  margin-top: 0;
  margin-bottom: 1em;
}
</style>
