<%@ WebHandler Language="C#" Class="LoadOrCreateData" %>
using System;
using System.Web;
using System.IO;
using System.Text;

public class LoadOrCreateData : IHttpHandler {
    public void ProcessRequest (HttpContext context) {
        // 设置响应格式为JSON，解决中文乱码
        context.Response.ContentType = "application/json";
        context.Response.ContentEncoding = Encoding.UTF8;
        
        try {
            // 获取前端传入的用户名（文件名）
            string userName = context.Request.QueryString["userName"];
            if (string.IsNullOrEmpty(userName)) {
                context.Response.StatusCode = 400;
                context.Response.Write("{\"success\":false,\"msg\":\"用户名不能为空\",\"data\":[]}");
                return;
            }
            
            // 拼接文件路径（IIS网站根目录）
            string fileName = $"{userName}.json";
            string filePath = Path.Combine(context.Server.MapPath("~/"), fileName);

            // 若文件不存在，创建空JSON文件
            if (!File.Exists(filePath)) {
                File.WriteAllText(filePath, "[]", Encoding.UTF8);
                context.Response.Write("{\"success\":true,\"msg\":\"创建空文件成功\",\"data\":[]}");
                return;
            }

            // 若文件存在，读取数据并返回
            string fileContent = File.ReadAllText(filePath, Encoding.UTF8);
            context.Response.Write($"{fileContent}");
        } catch (Exception ex) {
            context.Response.StatusCode = 500;
            context.Response.Write($"{{\"success\":false,\"msg\":\"操作失败：{ex.Message}\",\"data\":[]}}");
        }
    }

    public bool IsReusable {
        get { return false; }
    }
}