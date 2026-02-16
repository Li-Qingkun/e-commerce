<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Web.Script.Serialization" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        Response.ContentType = "application/json";
        try
        {
            string fileName = Request.Form["fileName"];
            string filePath = Request.Form["filePath"];
            string data = Request.Form["data"];

            if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(filePath))
            {
                Response.Write("{\"success\":false,\"msg\":\"File name or path cannot be empty\"}");
                return;
            }

            string rootPath = Server.MapPath("/");
            string fullDirectoryPath = Path.Combine(rootPath, filePath.TrimStart('/'));
            string fullFilePath = Path.Combine(fullDirectoryPath, fileName);

            if (!Directory.Exists(fullDirectoryPath))
            {
                Directory.CreateDirectory(fullDirectoryPath);
            }

            File.WriteAllText(fullFilePath, data, System.Text.Encoding.UTF8);

            Response.Write("{\"success\":true,\"msg\":\"File saved successfully\"}");
        }
        catch (Exception ex)
        {
            string errorMsg = ex.Message.Replace("\"", "\\\"");
            Response.Write("{\"success\":false,\"msg\":\"" + errorMsg + "\"}");
        }
    }
</script>