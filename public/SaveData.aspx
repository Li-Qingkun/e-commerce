<%@ Page Language="C#" AutoEventWireup="true" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Text" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        Response.ContentType = "application/json";
        Response.ContentEncoding = Encoding.UTF8;
        Response.Charset = "UTF-8";
        
        try
        {
            string userName = Request.Form["userName"];
            string data = Request.Form["data"];
            
            if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(data))
            {
                Response.Write("{\"success\":false,\"msg\":\"user name or data empty\"}");
                Response.End();
                return;
            }

            string fileName = userName.Trim() + ".json";
            string filePath = Server.MapPath("~/data/" + fileName);

            File.WriteAllText(filePath, data, Encoding.UTF8);
            Response.Write("{\"success\":true,\"msg\":\"save success\"}");
        }
        catch (Exception ex)
        {
            Response.Write("{\"success\":false,\"msg\":\"save fail: " + ex.Message.Replace("\"", "'") + "\"}");
        }
        finally
        {
            Response.End();
        }
    }
</script>