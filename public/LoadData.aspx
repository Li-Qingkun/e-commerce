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
            string userName = Request.QueryString["userName"];
            if (string.IsNullOrEmpty(userName))
            {
                Response.Write("{\"success\":false,\"msg\":\"user name is empty\",\"data\":[]}");
                Response.End();
                return;
            }
            
            string fileName = userName.Trim() + ".json";
            string filePath = Server.MapPath("~/data/" + fileName);

            if (!File.Exists(filePath))
            {
                File.WriteAllText(filePath, "[]", Encoding.UTF8);
                Response.Write("{\"success\":true,\"msg\":\"create file success\",\"data\":[]}");
                Response.End();
                return;
            }

            string fileContent = File.ReadAllText(filePath, Encoding.UTF8);
            Response.Write(fileContent);
        }
        catch (Exception ex)
        {
            Response.Write("{\"success\":false,\"msg\":\"load fail: " + ex.Message.Replace("\"", "'") + "\",\"data\":[]}");
        }
        finally
        {
            Response.End();
        }
    }
</script>