# Křížová kompilace: SDK běží nativně na architektuře runneru, výstup se staví
# pro cílovou architekturu. Žádné QEMU, žádné zpomalení.
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
ARG TARGETARCH
WORKDIR /src

COPY src/OrlickyPohar.Api/*.csproj src/OrlickyPohar.Api/
RUN dotnet restore src/OrlickyPohar.Api/OrlickyPohar.Api.csproj -a $TARGETARCH

COPY . .
RUN dotnet publish src/OrlickyPohar.Api/OrlickyPohar.Api.csproj \
    -a $TARGETARCH -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
COPY --from=build /app .
# Oficiální .NET image od .NET 8 už nepřihlášeného uživatele `app` obsahuje
# a nastavuje APP_UID. Zakládat ho znovu skončí chybou adduser.
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "OrlickyPohar.Api.dll"]
