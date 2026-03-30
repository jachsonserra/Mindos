import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

interface Node {
  x: number;
  y: number;
  anim: Animated.Value;
  size: number;
}

interface NeuronCanvasProps {
  width: number;
  height: number;
  nodeCount?: number;
  color?: string;
}

export function NeuronCanvas({ width, height, nodeCount = 7, color = '#A0845C' }: NeuronCanvasProps) {
  const animRefs = useRef<Animated.Value[]>([]);

  // Gerar nós com posições fixas (baseadas em proporção, não em random puro)
  const nodes = useRef<Node[]>(
    Array.from({ length: nodeCount }, (_, i) => {
      const angle = (i / nodeCount) * Math.PI * 2;
      const cx = width / 2;
      const cy = height / 2;
      const rx = (width * 0.38) * (0.6 + 0.4 * ((i % 3) / 3));
      const ry = (height * 0.38) * (0.6 + 0.4 * ((i % 2) / 2));
      return {
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        anim: new Animated.Value(0),
        size: 4 + (i % 3) * 2,
      };
    })
  ).current;

  useEffect(() => {
    const animations = nodes.map((node, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.timing(node.anim, {
            toValue: 1,
            duration: 1200 + i * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(node.anim, {
            toValue: 0,
            duration: 1200 + i * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, []);

  // Calcular conexões entre nós próximos
  const connections: { x1: number; y1: number; x2: number; y2: number; angle: number; dist: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < width * 0.55) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        connections.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y, angle, dist });
      }
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      {/* Conexões (linhas) */}
      {connections.map((conn, idx) => (
        <View
          key={`line-${idx}`}
          style={{
            position: 'absolute',
            left: conn.x1,
            top: conn.y1,
            width: conn.dist,
            height: 1,
            backgroundColor: color,
            opacity: 0.18,
            transform: [{ rotate: `${conn.angle}deg` }],
            transformOrigin: '0 50%' as any,
          }}
        />
      ))}
      {/* Nós (pontos pulsantes) */}
      {nodes.map((node, i) => {
        const scale = node.anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.4] });
        const opacity = node.anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
        return (
          <Animated.View
            key={`node-${i}`}
            style={{
              position: 'absolute',
              left: node.x - node.size / 2,
              top: node.y - node.size / 2,
              width: node.size,
              height: node.size,
              borderRadius: node.size / 2,
              backgroundColor: color,
              transform: [{ scale }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}
