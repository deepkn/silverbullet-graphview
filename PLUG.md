---
name: Library/deepkn/silverbullet-graphview
tags: meta/library
files:
- graphview.plug.js
---
# SilverBullet plug for showing a graph view of the documents

This plug aims to bring similar functionality as the Obsidian Graph view to
Silver Bullet.

## Usage
Run the `Show Global Graph` command to open up the global graph view - global graph is
your entire space visualized as the graph.

Run the `Show Local Graph` command to open up the local graph view - local graph is
your current page and it's immediate links, with an option to expand the graph one
level at a time.

Zoom and pan is supported by scroll and pinch gestures with the mouse(pad).

### Tags, Paths, Colors, Decorations and other options

Set tags on the pages to customize their appearance in the graph

- `#node_color=ff0000` → Change node color to red
- `#graphignore` → Hide the page from the graph

You can also use other custom tags to define node colors: Create a colormap with
HEX-colorcodes in `SETTINGS.md`. In this example, a node of a page where the tag
`#garden` is set will be rendered as green and a page at a path prefix `how-to`
will be rendered with color `#96020e`.

- `default_color` - Set the default color for all nodes in the graph. If not set, the plug
will choose sensible defaults based on whether the app is using light/dark mode.

- `ignoredPrefixes` - Use `ignoredPrefixes` to omit entire path prefixes from being displayed
in the graph.

- `position` (v2 only) - Specifies where the graph panel opens up. Can be one of `lhs` (left), `rhs` (right),
`bhs` (bottom), `modal` (modal window). Defaults to `lhs`.

- `enableDecorations` (v2 only) - Silverbullet allows you to add a `pageDecoration.prefix` property to a page,
which prefixes the page name everywhere. Typically this is an emoji, serves to quickly identify
a "type" of the page. If `enableDecorations` is set to `true`, and the page has an emoji
prefix, it will be used to decorate the node in the graph. Note: a longer prefix might get truncated.

**V2:**
```lua
config.set {
  plugs = {
    -- Add your plugs here
    "ghr:deepkn/silverbullet-graphview",
    ...
  },
  ...
  graphview = {
    ignoredPrefixes = {
      "Library",
    },
    enableDecorations = true,
    position = "modal",
    colormap = {
      tag = {
        services = "01017a",
        notes = "02bdb6",
        ...
      },
    },
  },
...
}
```

## Links

Click on the node labels to directly navigate to pages in your space

## Label-shortening

Long labels are shortened for readability. E.g.
`notesarecool/somethingverylong/subsubsubsub/foo` → `notes./somet./subsu./foo`
