<%@ Page Language="C#" %>
<%@ Import Namespace="System" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Web" %>

<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        Response.ContentType = "application/json; charset=utf-8";
        Response.AddHeader("Access-Control-Allow-Origin", "*");
        Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");

        if (Request.HttpMethod == "OPTIONS")
        {
            Response.StatusCode = 200;
            Response.End();
            return;
        }

        try
        {
            string shopName = Request.QueryString["shopName"];
            string queryDate = Request.QueryString["queryDate"];
            string cookieStr = Request.QueryString["cookie"];

            if (string.IsNullOrEmpty(shopName) || string.IsNullOrEmpty(queryDate))
            {
                Response.Write("{\"code\":400,\"msg\":\"Parameter cannot be empty\"}");
                Response.End();
                return;
            }

            string encodedShopName = HttpUtility.UrlEncode(shopName);
            string targetApiUrl = string.Format("https://qnzg.cn/api/dk/seller/activity/queryOrders?app=0&activityId=&productId=&shopName={0}&startDt={1}&endDt={1}&orderId=&flowPoint=&pageNum=1&total=6&pageSize=100", encodedShopName, queryDate);

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(targetApiUrl);
            request.Method = "GET";
            request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            request.Accept = "application/json";
            request.CookieContainer = new CookieContainer();

            foreach (string cookieItem in cookieStr.Split(';'))
            {
                if (!string.IsNullOrWhiteSpace(cookieItem))
                {
                    string[] cookieParts = cookieItem.Trim().Split(new[] { '=' }, 2);
                    if (cookieParts.Length == 2)
                    {
                        request.CookieContainer.Add(new Cookie(
                            cookieParts[0].Trim(), 
                            cookieParts[1].Trim(), 
                            "/", 
                            "qnzg.cn"
                        ));
                    }
                }
            }

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (Stream stream = response.GetResponseStream())
            using (StreamReader reader = new StreamReader(stream))
            {
                string result = reader.ReadToEnd();
                Response.Write(result);
            }
        }
        catch (WebException ex)
        {
            string errorMsg = ex.Message;
            if (ex.Response != null)
            {
                using (Stream stream = ex.Response.GetResponseStream())
                using (StreamReader reader = new StreamReader(stream))
                {
                    errorMsg = reader.ReadToEnd();
                }
            }
            Response.Write(string.Format("{{\"code\":500,\"msg\":\"Request failed: {0}\"}}", HttpUtility.JavaScriptStringEncode(errorMsg)));
        }
        catch (Exception ex)
        {
            Response.Write(string.Format("{{\"code\":500,\"msg\":\"Server error: {0}\"}}", HttpUtility.JavaScriptStringEncode(ex.Message)));
        }
        finally
        {
            Response.End();
        }
    }
</script>