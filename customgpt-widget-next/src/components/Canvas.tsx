'use client';

import { useEffect, useRef } from 'react';

const Canvas = (props: any) => {
    const {draw, ...rest} = props;
    const canvasRef = useCanvas(draw);

    return <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
        }}
        {...rest}
    />
}

const useCanvas = (draw: any) => {

    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {

        const canvas = canvasRef.current
        if (!canvas) return;

        const context = canvas.getContext('2d')
        if (!context) return;

        const displayWidth = canvas.width
        const displayHeight = canvas.height

        // projection center coordinates sets location of origin
        const projCenterX = displayWidth / 2
        const projCenterY = displayHeight / 2

        let animationFrameId: number

        const render = () => {
            draw(context, displayWidth, displayHeight, projCenterX, projCenterY)
            animationFrameId = window.requestAnimationFrame(render)
        }
        render()

        return () => {
            window.cancelAnimationFrame(animationFrameId)
        }
    }, [draw])

    return canvasRef
}

export default Canvas