var builder = WebApplication.CreateBuilder(args);

// เปิดใช้งาน YARP (Reverse Proxy)
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// อนุญาต CORS ให้หน้าบ้าน (Frontend) เรียกผ่าน .NET ได้
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("AllowAll");

// ให้ .NET จัดการ Route ทั้งหมดและส่งต่อไปหา Python
app.MapReverseProxy();

app.Run();
