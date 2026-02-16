<%@ WebHandler Language="C#" Class="LoadOrCreateData" %>
using System;
using System.Web;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public class LoadOrCreateData : IHttpHandler {
    private static readonly JavaScriptSerializer jsonSerializer = new JavaScriptSerializer();
    
    public void ProcessRequest (HttpContext context) {
        context.Response.Clear();
        context.Response.ContentType = "application/json";
        context.Response.ContentEncoding = Encoding.UTF8;
        context.Response.Charset = "UTF-8";
        
        try {
            string userName = context.Request.QueryString["userName"]?.Trim();
                if (string.IsNullOrEmpty(userName)) {
                    var errorResult = new {
                        success = false,
                        msg = "yonghu ming bu neng wei kong",
                        data = new string[0]
                    };
                    context.Response.StatusCode = 400;
                    context.Response.Write(jsonSerializer.Serialize(errorResult));
                    return;
                }
            
            string safeFileName = Path.GetInvalidFileNameChars()
                .Aggregate(userName, (current, c) => current.Replace(c.ToString(), "_"));
            string filePath = Path.Combine(context.Server.MapPath("~/"), safeFileName + ".json");

            if (!File.Exists(filePath)) {
                File.WriteAllText(filePath, "[]", Encoding.UTF8);
                var successResult = new {
                    success = true,
                    msg = "2",
                    data = new string[0]
                };
                context.Response.Write(jsonSerializer.Serialize(successResult));
                return;
            }

            string fileContent = File.ReadAllText(filePath, Encoding.UTF8);
            context.Response.Write(fileContent);
        } catch (Exception ex) {
            var exceptionResult = new {
                success = false,
                msg = "3" + ex.Message,
                data = new string[0]
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