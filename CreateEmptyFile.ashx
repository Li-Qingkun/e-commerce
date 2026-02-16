<%@ WebHandler Language="C#" Class="CreateEmptyFile" %>
using System;
using System.Web;
using System.IO;

public class CreateEmptyFile : IHttpHandler {
    public void ProcessRequest (HttpContext context) {
        context.Response.ContentType = "application/json";
        try {
            // 获取文件名
            string fileName = context.Request.Form["fileName"];
            if (string.IsNullOrEmpty(fileName)) {
                context.Response.StatusCode = 400;
                context.Response.Write("{\"success\":false,\"msg\":\"文件名不能为空\"}");
                return;
            }
            // 文件保存路径（public文件夹）
            string filePath = Path.Combine(context.Server.MapPath("~/"), fileName);
            // 写入空数组
            File.WriteAllText(filePath, "[]");
            context.Response.Write("{\"success\":true,\"msg\":\"空文件创建成功\"}");
        } catch (Exception ex) {
            context.Response.StatusCode = 500;
            context.Response.Write($"{{\"success\":false,\"msg\":\"{ex.Message}\"}}");
        }
    }
    public bool IsReusable { get { return false; } }
}