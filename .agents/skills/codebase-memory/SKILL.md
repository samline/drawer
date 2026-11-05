---
name: codebase-memory
description: Use the `codebase-memory-mcp` knowledge graph as the primary source of truth for any query about repository structure, routing, components, function calls, implementation tracking, or general codebase architecture. Load this skill BEFORE answering questions about the codebase — never reach for raw file reads or grep before consulting the graph.
license: MIT
metadata:
  version: '1.2'
  verified_against_mcp_toolset: '2026-06-30'
  verified_tools:
    - delete_project
    - detect_changes
    - get_architecture
    - get_code_snippet
    - get_graph_schema
    - index_repository
    - index_status
    - ingest_traces
    - list_projects
    - manage_adr
    - query_graph
    - search_code
    - search_graph
    - trace_path
---

# Codebase Memory MCP Integration

You are connected to a persistent knowledge graph via `codebase-memory-mcp`.

## ⚠️ ABSOLUTE AND NON-NEGOTIABLE RULE

**The knowledge graph is THE ONLY source of truth for any query about the codebase.** Before generating any response, searching files, or invoking `read_file`/`grep_search`/`file_search`, you MUST always consult the graph first.

### Mandatory flow (in order)

1. **Is the project indexed?** → `mcp_codebase-memo_index_status` or `mcp_codebase-memo_list_projects`. If it is not indexed or is incomplete → `mcp_codebase-memo_index_repository` **before answering anything**.
2. **Is the question about finding a symbol, route, class, view, method, controller, component, variable, constant, configuration, or any code entity?** → `mcp_codebase-memo_search_graph` (BM25 / pattern / semantic) **ALWAYS first**.
3. **Is the question about who calls what, dependencies, data flow, or impact?** → `mcp_codebase-memo_trace_path`.
4. **Is the question about multi-hop analysis, metrics, aggregations, or complexity?** → `mcp_codebase-memo_query_graph` (Cypher).
5. **Is the question about architecture, modules, services, clusters, or general structure?** → `mcp_codebase-memo_get_architecture`.
6. **Only as a LAST RESORT**, when the graph cannot answer (for example: exact content of a file without indexed symbols, or a recently created file not yet indexed), fall back to `read_file`/`grep_search`/`file_search`. In that case, if the information is useful and durable, ingest it into the graph with `mcp_codebase-memo_ingest_traces` or similar.
7. **Never** use `read_file`, `grep_search`, or `file_search` as the first option for codebase queries. The graph exists precisely to avoid that.

## Available tools

| Tool                                 | Purpose                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `mcp_codebase-memo_search_graph`     | BM25 / pattern / semantic search for functions, classes, routes, variables |
| `mcp_codebase-memo_search_code`      | Graph-augmented lexical search over source files                           |
| `mcp_codebase-memo_get_code_snippet` | Read source for a specific symbol                                          |
| `mcp_codebase-memo_trace_path`       | Trace callers / callees / data flow / cross-service paths                  |
| `mcp_codebase-memo_query_graph`      | Arbitrary Cypher queries for multi-hop patterns and aggregations           |
| `mcp_codebase-memo_get_architecture` | High-level architecture overview (packages, services, clusters)            |
| `mcp_codebase-memo_get_graph_schema` | Node labels and edge types in the graph                                    |
| `mcp_codebase-memo_index_repository` | Index a repo into the graph (only when missing or stale)                   |
| `mcp_codebase-memo_index_status`     | Check if a project is indexed                                              |
| `mcp_codebase-memo_list_projects`    | List indexed projects                                                      |
| `mcp_codebase-memo_detect_changes`   | Detect code changes and their impact                                       |
| `mcp_codebase-memo_delete_project`   | Remove a project from the index                                            |
| `mcp_codebase-memo_ingest_traces`    | Enrich the graph with runtime traces                                       |
| `mcp_codebase-memo_manage_adr`       | Manage Architecture Decision Records                                       |

## Decision flow

1. Is the project indexed? If unsure → `mcp_codebase-memo_index_status` or `mcp_codebase-memo_list_projects`.
2. Is the question about **finding a symbol, route, class, or implementation**?
   - Try `mcp_codebase-memo_search_graph` (BM25 / pattern / semantic) first.
   - Use `mcp_codebase-memo_search_code` for lexical-with-context searches.
3. Is the question about **callers, callees, dependencies, or impact**?
   - Use `mcp_codebase-memo_trace_path` with the appropriate `mode`.
4. Is the question about **multi-hop analysis, metrics, or aggregations**?
   - Use `mcp_codebase-memo_query_graph` with Cypher.
5. Is the question about **architecture, modules, or services**?
   - Use `mcp_codebase-memo_get_architecture`.
6. Only when the graph cannot answer, fall back to `read_file`, `grep_search`, or `file_search` — and prefer to ingest the result back into the graph if it represents durable knowledge.

## Rules of thumb

- **Always prefer the graph over reading files.** A `search_graph` + `get_code_snippet` pair is almost always cheaper than scanning the workspace.
- **Stay scoped.** Use `label`, `name_pattern`, `file_pattern`, and `path_filter` to keep result sets small.
- **Paginate deliberately.** When `has_more` is true, page with `offset` rather than raising `limit` blindly.
- **Index first if missing.** If a project is not indexed, run `mcp_codebase-memo_index_repository` once before answering questions about it.
- **Don't fabricate paths.** The graph is the source of truth for paths and qualified names.
