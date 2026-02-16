<%@ WebHandler Language="C#" Class="SaveData" %>
using System;
using System.Web;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public class SaveData : IHttpHandler {
    private static readonly JavaScriptSerializer jsonSerializer = new JavaScriptSerializer();
    
    public void ProcessRequest (HttpContext context) {
        context.Response.Clear();
        context.Response.ContentType = "application/json";
        context.Response.ContentEncoding = Encoding.UTF8;
        context.Response.Charset = "UTF-8";
        
        try {
            // 获取前端参数
            string userName = context.Request.Form["userName"]?.Trim();
            string data = context.Request.Form["data"]?.Trim();
            
            if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(data)) {
                var errorResult = new {
                    success = false,
                    msg = "用户名或数据不能为空"
                };
                context.Response.StatusCode = 400;
                context.Response.Write(jsonSerializer.Serialize(errorResult));
                return;
            }

            // 安全处理文件名，避免非法字符
            string safeFileName = Path.GetInvalidFileNameChars()
                .Aggregate(userName, (current, c) => current.Replace(c.ToString(), "_"));
            string filePath = Path.Combine(context.Server.MapPath("~/"), $"{safeFileName}.json");

            // 写入数据（强制UTF-8编码）
            File.WriteAllText(filePath, data, new UTF8Encoding(false)); // false = 不带BOM头
            
            var successResult = new {
                success = true,
                msg = "数据已同步到本地文件"
            };
            context.Response.Write(jsonSerializer.Serialize(successResult));
        } catch (Exception ex) {
            var exceptionResult = new {
                success = false,
                msg = $"保存失败：{ex.Message}"
            };
            context.Response.StatusCode = 500;
            context.Response.Write(jsonSerializer.Serialize(exceptionResult));
        } finally {
            context.Response.End();
        }
    }

    public bool IsReusable {
        get { return false; }
    }
}