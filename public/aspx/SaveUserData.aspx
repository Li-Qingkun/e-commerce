<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>

<script runat="server">
void Page_Load(object sender, EventArgs e)
{
    Response.ContentType = "application/json";
    Response.Charset = "UTF-8";

    try
    {
        string post_data = Request.Form["data"];

        if (string.IsNullOrEmpty(post_data))
        {
            Response.Write("{\"success\":false,\"msg\":\"No data received\"}");
            return;
        }
        string rootPath = HttpContext.Current.Server.MapPath("/");
        string jsonPath = Path.Combine(rootPath, "data", "userdata.json");
        string dataDir = Path.GetDirectoryName(jsonPath);
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
        File.WriteAllText(jsonPath, post_data, System.Text.Encoding.UTF8);
        Response.Write("{\"success\":true,\"msg\":\"Success\"}");
    }
    catch (Exception ex)
    {
        string errMsg = ex.Message.Replace("\"", "\\\"");
        Response.Write("{\"success\":false,\"msg\":\"" + errMsg + "\"}");
    }
}
</script>