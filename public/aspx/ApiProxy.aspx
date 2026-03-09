<%@ Page Language="C#" AutoEventWireup="true" %>
<%@ Import Namespace="System" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Web" %>
<%@ Import Namespace="System.Web.Script.Serialization" %>

<script runat="server">
protected void Page_Load(object sender, EventArgs e)
{
    Response.ContentType = "application/json";
    Response.Charset = "utf-8";
    JavaScriptSerializer serializer = new JavaScriptSerializer();

    try
    {
        StreamReader sr = new StreamReader(Request.InputStream);
        string json = sr.ReadToEnd();
        sr.Close();

        var data = serializer.DeserializeObject(json) as System.Collections.Generic.Dictionary<string, object>;
        string cookie = Request.QueryString["cookie"];
        if (!string.IsNullOrEmpty(cookie)) cookie = HttpUtility.UrlDecode(cookie);

        string type = GetDicValue(data, "type");
        string url = "";
        StringBuilder sb = new StringBuilder();

        if (type == "preview")
        {
            url = "https://qnzg.cn/api/dk/seller/activity/batchPreview";
            sb.Append("app=" + HttpUtility.UrlEncode(GetDicValue(data, "app")));
            sb.Append("&goodsUrl=" + GetDicValue(data, "goodsUrl"));
            sb.Append("&shopId=" + HttpUtility.UrlEncode(GetDicValue(data, "shopId")));
        }
        else if (type == "create")
        {
            url = "https://qnzg.cn/api/dk/seller/activity/createWithNoUnion";
            sb.Append("activityName=" + HttpUtility.UrlEncode(GetDicValue(data, "activityName")));
            sb.Append("&goodsUrl=" + HttpUtility.UrlEncode(GetDicValue(data, "goodsUrl")));
            sb.Append("&productImg=" + HttpUtility.UrlEncode(GetDicValue(data, "productImg")));
            sb.Append("&spreadNum=" + GetDicValue(data, "spreadNum"));
            sb.Append("&serviceType=" + GetDicValue(data, "serviceType"));
            sb.Append("&app=" + GetDicValue(data, "app"));
            sb.Append("&sffl=" + GetDicValue(data, "sffl"));
            sb.Append("&fanliPrice=" + GetDicValue(data, "fanliPrice"));
            sb.Append("&doudianPrice=" + GetDicValue(data, "doudianPrice"));
            sb.Append("&activityStartTime=" + HttpUtility.UrlEncode(GetDicValue(data, "activityStartTime")));
            sb.Append("&categoryId=" + GetDicValue(data, "categoryId"));
            sb.Append("&buyWay=" + GetDicValue(data, "buyWay"));
            sb.Append("&buyerLabel=" + GetDicValue(data, "buyerLabel"));
            sb.Append("&goodsShareUrl=" + HttpUtility.UrlEncode(GetDicValue(data, "goodsShareUrl")));
            sb.Append("&goodsPassword=" + HttpUtility.UrlEncode(GetDicValue(data, "goodsPassword")));
            sb.Append("&sfdf=" + GetDicValue(data, "sfdf"));
            sb.Append("&shopId=" + HttpUtility.UrlEncode(GetDicValue(data, "shopId")));
            sb.Append("&genderLabel=" + GetDicValue(data, "genderLabel"));
            sb.Append("&ageLabel=" + GetDicValue(data, "ageLabel"));
            sb.Append("&timeInterval=" + GetDicValue(data, "timeInterval"));
        }
        else
        {
            Output(serializer, -1, "unknown type");
            return;
        }

        string resp = Post(url, sb.ToString(), cookie);
        Response.Write(resp);
    }
    catch (Exception ex)
    {
        Output(serializer, -1, ex.Message);
    }
}

private string GetDicValue(object obj, string key)
{
    try
    {
        System.Collections.IDictionary dic = obj as System.Collections.IDictionary;
        if (dic == null || !dic.Contains(key)) 
        {
            return "";
        }
        object value = dic[key];
        if (value == null)
        {
            return "";
        }
        else
        {
            return value.ToString();
        }
    }
    catch
    {
        return "";
    }
}

private string Post(string url, string postData, string cookieStr)
{
    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
    request.Method = "POST";
    request.ContentType = "application/x-www-form-urlencoded";
    request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    request.Accept = "application/json, text/plain, */*";
    request.Referer = "https://qnzg.cn/douke/index.html";
    request.Headers.Add("Origin", "https://qnzg.cn");
    request.Timeout = 15000;

    if (!string.IsNullOrEmpty(cookieStr))
    {
        request.CookieContainer = new CookieContainer();
        foreach (string item in cookieStr.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries))
        {
            if (item.Contains('='))
            {
                string[] p = item.Split(new[] { '=' }, 2);
                request.CookieContainer.Add(new Cookie(p[0].Trim(), p[1].Trim(), "/", "qnzg.cn"));
            }
        }
    }

    byte[] bytes = Encoding.UTF8.GetBytes(postData);
    request.ContentLength = bytes.Length;
    using (Stream s = request.GetRequestStream()) s.Write(bytes, 0, bytes.Length);

    using (HttpWebResponse resp = (HttpWebResponse)request.GetResponse())
    using (StreamReader reader = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
    {
        return reader.ReadToEnd();
    }
}

private void Output(JavaScriptSerializer serializer, int code, object msg)
{
    Response.Clear();
    var obj = new { code, msg };
    Response.Write(serializer.Serialize(obj));
    HttpContext.Current.ApplicationInstance.CompleteRequest();
}
</script>