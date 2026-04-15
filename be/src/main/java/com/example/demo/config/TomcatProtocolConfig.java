package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;

/**
 * Force Tomcat connector protocol via Spring Boot customization.
 *
 * Some Windows + JDK combinations can fail with "Unable to establish loopback connection"
 * during selector initialization. Allow overriding the connector protocol to try NIO2/NIO.
 */
@Configuration
public class TomcatProtocolConfig implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Value("${server.tomcat.protocol:}")
    private String tomcatProtocol;

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        if (tomcatProtocol != null && !tomcatProtocol.isBlank()) {
            factory.setProtocol(tomcatProtocol.trim());
        }
    }
}

