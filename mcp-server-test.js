
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name: "demo_service",
    version: "1.0.0"
});

server.tool(
    "say_hello",
    {
        needShowMeText: z.string().describe("想要展示的话")
    },
    async ({ needShowMeText }) => {
        try {
            // 返回成功响应
            return {
                content: [{ type: "text", text: 'Hello =>' + needShowMeText }]
            };
        } catch (error) {
            // 错误处理
            return {
                content: [{ type: "text", text: `失败: ${error.message}` }],
                isError: true
            };
        }
    }
);

async function main() {
    try {
        console.log("MCP服务器启动中...");
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log("MCP服务器已启动并等待连接");
    } catch (error) {
        console.error("启动服务器时出错:", error);
        process.exit(1);
    }
}

main();