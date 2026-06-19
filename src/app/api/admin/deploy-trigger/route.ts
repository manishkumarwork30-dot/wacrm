import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    // We can modify a comment in sidebar.tsx to trigger Vercel redeployment upon Git integration detection
    const sidebarPath = path.join(process.cwd(), "src", "components", "layout", "sidebar.tsx");
    
    if (fs.existsSync(sidebarPath)) {
      let content = fs.readFileSync(sidebarPath, "utf-8");
      
      // Update comment trigger line
      const triggerLineMatch = content.match(/\/\/ Vercel update trigger - Text Formatter deployment check (\d+)/);
      let newTriggerValue = 1;
      if (triggerLineMatch) {
        newTriggerValue = parseInt(triggerLineMatch[1], 10) + 1;
        content = content.replace(
          /\/\/ Vercel update trigger - Text Formatter deployment check \d+/,
          `// Vercel update trigger - Text Formatter deployment check ${newTriggerValue}`
        );
      } else {
        content = `// Vercel update trigger - Text Formatter deployment check ${newTriggerValue}\n` + content;
      }

      fs.writeFileSync(sidebarPath, content, "utf-8");
      return NextResponse.json({ success: true, message: `Deployment change registered (${newTriggerValue}). Please push code to Vercel.` });
    }

    return NextResponse.json({ error: "Sidebar file not found to inject redeploy trigger." }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to trigger" }, { status: 500 });
  }
}
