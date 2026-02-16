<%@ WebHandler Language="C#" Class="SaveUserFile" %>
using System;
using System.Web;
using System.IO;

public class SaveUserFile : IHttpHandler {
    public void ProcessRequest (HttpContext context) {
        context.Response.ContentType = "application/json";
        try {
            string fileName = context.Request.Form["fileName"];
            string data = context.Request.Form["data"];
            if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(data)) {
                context.Response.StatusCode = 400;
                context.Response.Write("{\"success\":false,\"msg\":\"参数不能为空\"}");
                return;
            }
            string filePath = Path.Combine(context.Server.MapPath("~/"), fileName);
            File.WriteAllText(filePath, data);
            context.Response.Write("{\"success\":true,\"msg\":\"保存成功\"}");
        } catch (Exception ex) {
            context.Response.StatusCode = 500;
            context.Response.Write($"{{\"success\":false,\"msg\":\"{ex.Message}\"}}");
        }
    }
    public bool IsReusable { get { return false; } }
}