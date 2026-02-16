<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Web" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            Response.ContentType = "application/json";
            Response.Charset = "UTF-8";

            string logsJson = Request.Form["logs"];
            if (string.IsNullOrEmpty(logsJson))
            {
                Response.Write("{\"success\":false,\"msg\":\"NULL\"}");
                return;
            }

            string savePath = Server.MapPath("~/data/operation-logs.json");
            string directory = Path.GetDirectoryName(savePath);

            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(savePath, logsJson, System.Text.Encoding.UTF8);

            Response.Write("{\"success\":true,\"msg\":\"Save\"}");
        }
        catch (Exception ex)
        {
            Response.Write("{\"success\":false,\"msg\":\"" + ex.Message.Replace("\"", "\\\"") + "\"}");
        }
    }
</script>