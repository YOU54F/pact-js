import wrapper from "@you54f/pact-node"

// used to kill any left over mock server instances
process.on("SIGINT", () => {
  wrapper.removeAllServers()
})
