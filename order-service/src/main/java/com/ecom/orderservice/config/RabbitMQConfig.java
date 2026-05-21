package com.ecom.orderservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE      = "ecom.exchange";
    public static final String QUEUE_PLACED  = "order.placed.queue";
    public static final String QUEUE_SHIPPED = "order.shipped.queue";
    public static final String KEY_PLACED    = "order.placed";
    public static final String KEY_SHIPPED   = "order.shipped";

    @Bean
    public TopicExchange ecomExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue orderPlacedQueue() {
        return new Queue(QUEUE_PLACED);
    }

    @Bean
    public Queue orderShippedQueue() {
        return new Queue(QUEUE_SHIPPED);
    }

    @Bean
    public Binding orderPlacedBinding(Queue orderPlacedQueue, TopicExchange ecomExchange) {
        return BindingBuilder.bind(orderPlacedQueue).to(ecomExchange).with(KEY_PLACED);
    }

    @Bean
    public Binding orderShippedBinding(Queue orderShippedQueue, TopicExchange ecomExchange) {
        return BindingBuilder.bind(orderShippedQueue).to(ecomExchange).with(KEY_SHIPPED);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
