<%@ Page Language="C#" ContentType="application/json; charset=utf-8" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Web" %>
<%
    try
    {
        Response.ContentType = "application/json; charset=utf-8";
        Response.Charset = "UTF-8";
        
        string data = Request.Form["data"];
        if (string.IsNullOrEmpty(data))
        {
            Response.Write("{\"success\":false,\"msg\":\"no\"}");
            return;
        }
        
        string filePath = Server.MapPath("/data/recharge-records.json");
        
        string directory = Path.GetDirectoryName(filePath);
        if (!Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }
        
        File.WriteAllText(filePath, data, System.Text.Encoding.UTF8);
        
        Response.Write("{\"success\":true,\"msg\":\"saveOK\"}");
    }
    catch (Exception ex)
    {
        string errorMsg = ex.Message.Replace("\"", "\\\"").Replace("\r\n", " ");
        Response.Write("{\"success\":false,\"msg\":\"" + errorMsg + "\"}");
    }
%>